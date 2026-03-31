"""
Batch CSV → appeal text + PDFs → ZIP (background job).
"""
import csv
import io
import os
import re
import shutil
import threading
import time
import uuid
import zipfile
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from types import SimpleNamespace

from flask import current_app

from credit_manager import CreditManager
from stripe_billing import StripeBilling
from models import db, User
from advanced_ai_generator import advanced_ai_generator
from appeal_pdf_builder import build_professional_pdf_bytes, build_appeal_pdf_filename
from pdf_parser import parse_denial_pdf

MAX_BATCH_ROWS = 100
MAX_PDF_BATCH_FILES = 100
_jobs_lock = threading.Lock()
_jobs = {}  # job_id -> dict


def _gval(row, key, alt_keys=()):
    lk = str(key).lower() if key else key
    if key in row and row[key] not in (None, ''):
        return row[key]
    if lk in row and row[lk] not in (None, ''):
        return row[lk]
    for k in alt_keys:
        if k in row and row[k] not in (None, ''):
            return row[k]
        lk2 = str(k).lower()
        if lk2 in row and row[lk2] not in (None, ''):
            return row[lk2]
    return None


def _normalize_row_keys(row):
    if not row:
        return {}
    out = {}
    for k, v in row.items():
        if k is None:
            continue
        nk = str(k).strip().lower().replace(' ', '_').replace('-', '_')
        if nk and v not in (None, ''):
            out[nk] = v
    return out


def _parse_date(row):
    raw = _gval(row, 'date_of_service', ('Date of Service', 'dos', 'service_date'))
    if not raw:
        return None
    s = str(raw).strip()[:10]
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _build_denial_reason(row, claim_number):
    explicit = str(_gval(row, 'denial_reason', ('reason', 'denial', 'remarks')) or '').strip()
    carc = str(
        _gval(row, 'carc_codes', ('carc', 'CARC', 'denial_code')) or ''
    ).strip()
    rarc = str(_gval(row, 'rarc_codes', ('rarc', 'RARC')) or '').strip()
    mods = str(_gval(row, 'modifiers', ('modifier',)) or '').strip()
    billed = _gval(row, 'billed_amount', ('billed', 'Billed Amount'))
    paid = _gval(row, 'paid_amount', ('paid', 'Paid Amount'))
    lines = []
    if explicit:
        lines.append(explicit)
        lines.append('')
    lines.extend(
        [
            'Denial / remittance summary (batch import):',
            f'Claim Number: {claim_number}',
        ]
    )
    if carc:
        lines.append(f'CARC code(s): {carc}')
    if rarc:
        lines.append(f'RARC code(s): {rarc}')
    if mods:
        lines.append(f'Modifier(s): {mods}')
    if billed not in (None, ''):
        lines.append(f'Billed amount: {billed}')
    if paid not in (None, ''):
        lines.append(f'Paid amount: {paid}')
    lines.append(
        'The payer adjusted or denied this claim as reflected in the remittance data above. '
        'This appeal requests correction and reprocessing.'
    )
    return '\n'.join(lines)


def _row_to_ephemeral_appeal(row, defaults, row_index):
    claim_number = str(_gval(row, 'claim_number', ('claim_id', 'Claim ID')) or '').strip()
    if not claim_number:
        claim_number = f'BATCH-R{row_index + 1}-{uuid.uuid4().hex[:6].upper()}'
    payer = str(_gval(row, 'payer', ('Payer', 'insurance')) or '').strip() or 'Unknown payer'

    dos = _parse_date(row)
    if dos is None:
        dos = defaults.get('date_of_service')
        if dos:
            dos = datetime.strptime(str(dos)[:10], '%Y-%m-%d').date()
        else:
            dos = date.today()

    cpt = str(_gval(row, 'cpt_codes', ('CPT',)) or defaults.get('cpt_codes') or '').strip()[:200]
    icd = str(_gval(row, 'icd_codes', ('diagnosis_code', 'ICD', 'icd')) or defaults.get('icd_codes') or '').strip()[:200]

    try:
        billed = Decimal(str(_gval(row, 'billed_amount', ('Amount',)) or '0'))
    except (InvalidOperation, TypeError):
        billed = Decimal('0')

    denial_reason = _build_denial_reason(row, claim_number)
    appeal_id = f"BAT-{datetime.utcnow().strftime('%Y%m%d')}-{row_index:04d}-{uuid.uuid4().hex[:6].upper()}"

    provider = str(defaults.get('provider_name') or 'Provider').strip()[:200]
    npi = str(defaults.get('provider_npi') or '0000000000').strip()[:20]
    addr = str(defaults.get('provider_address') or 'Address on file').strip()[:300]

    denial_code = str(_gval(row, 'denial_code', ('carc_codes', 'carc')) or '').strip()[:50] or None

    return SimpleNamespace(
        appeal_id=appeal_id,
        payer=payer[:200],
        claim_number=claim_number[:100],
        patient_id=str(defaults.get('patient_id') or 'PT')[:100],
        provider_name=provider,
        provider_npi=npi,
        provider_address=addr,
        date_of_service=dos,
        denial_reason=denial_reason,
        denial_code=denial_code,
        diagnosis_code=icd or None,
        cpt_codes=cpt or None,
        billed_amount=billed,
        appeal_level='level_1',
        generated_letter_text=None,
    ), None


def _parse_pdf_to_ephemeral(parse: dict, defaults, index: int, source_name: str):
    if not parse:
        return None, 'empty parse result'
    if not parse.get('success'):
        return None, str(parse.get('error') or parse.get('message') or 'extraction failed')

    claim_number = str(parse.get('claim_number') or '').strip() or f'DOC-{index + 1}'
    payer = str(parse.get('payer_name') or '').strip() or 'Unknown payer'

    dos = None
    for key in ('service_date', 'denial_date'):
        raw = parse.get(key)
        if raw:
            try:
                dos = datetime.strptime(str(raw)[:10], '%Y-%m-%d').date()
                break
            except ValueError:
                continue
    if dos is None:
        dos = date.today()

    billed = Decimal('0')
    if parse.get('billed_amount') is not None:
        try:
            billed = Decimal(str(parse['billed_amount']))
        except (InvalidOperation, TypeError):
            billed = Decimal('0')

    lines = []
    rt = parse.get('raw_text') or ''
    if rt:
        lines.append('--- Excerpt from denial document ---')
        lines.append(str(rt)[:4000])
    dcs = parse.get('denial_codes') or []
    if dcs:
        lines.append('Parsed adjustment / denial codes: ' + ', '.join(str(x) for x in dcs))
    rarc = parse.get('rarc_codes') or []
    if rarc:
        lines.append('RARC / remark codes: ' + ', '.join(str(x) for x in rarc))
    cpts = parse.get('cpt_codes') or []
    if cpts:
        lines.append('Procedure codes (extracted): ' + ', '.join(str(c) for c in cpts))
    icds = parse.get('icd_codes') or []
    if icds:
        lines.append('ICD codes (extracted): ' + ', '.join(str(c) for c in icds))
    if not lines:
        lines.append(f'Appeal generated from uploaded denial letter ({source_name}).')
    denial_reason = '\n'.join(lines)

    cpt_str = ','.join(str(c) for c in cpts)[:200] if cpts else None
    icd_str = ','.join(icds)[:200] if icds else None
    denial_code = str(dcs[0])[:50] if dcs else None

    appeal_id = f"BAT-PDF-{datetime.utcnow().strftime('%Y%m%d')}-{index:04d}-{uuid.uuid4().hex[:6].upper()}"
    provider = str(defaults.get('provider_name') or 'Provider').strip()[:200]
    npi = str(defaults.get('provider_npi') or '0000000000').strip()[:20]
    addr = str(defaults.get('provider_address') or 'Address on file').strip()[:300]

    return SimpleNamespace(
        appeal_id=appeal_id,
        payer=payer[:200],
        claim_number=claim_number[:100],
        patient_id=str(defaults.get('patient_id') or 'PT')[:100],
        provider_name=provider,
        provider_npi=npi,
        provider_address=addr,
        date_of_service=dos,
        denial_reason=denial_reason,
        denial_code=denial_code,
        diagnosis_code=icd_str,
        cpt_codes=cpt_str,
        billed_amount=billed,
        appeal_level='level_1',
        generated_letter_text=None,
    ), None


SUMMARY_FIELDS = ['row', 'source_file', 'claim_number', 'status', 'reason', 'seconds']


def _finalize_batch_zip(job, summary_rows, ok_count, job_label: str):
    out_dir = job['out_dir']
    zip_name = f"appeals_batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
    zip_path = os.path.join(out_dir, zip_name)
    sum_csv = os.path.join(out_dir, 'batch_summary.csv')
    with open(sum_csv, 'w', newline='', encoding='utf-8') as sf:
        w = csv.DictWriter(sf, fieldnames=SUMMARY_FIELDS)
        w.writeheader()
        for s in summary_rows:
            w.writerow({k: s.get(k, '') for k in SUMMARY_FIELDS})

    report_lines = [
        'Denial Appeal Pro — bulk processing report',
        f'Job type: {job_label}',
        f'Appeals generated (PDF): {ok_count}',
        f'Line items: {len(summary_rows)}',
        '',
        'Errors / skipped:',
    ]
    problems = [s for s in summary_rows if s.get('status') not in ('ok',)]
    if not problems:
        report_lines.append('(none)')
    else:
        for s in problems:
            report_lines.append(
                f"  Row {s.get('row')}: [{s.get('status')}] claim={s.get('claim_number', '')} "
                f"file={s.get('source_file', '')} — {s.get('reason', '')}"
            )
    report_path = os.path.join(out_dir, 'processing_report.txt')
    with open(report_path, 'w', encoding='utf-8') as rf:
        rf.write('\n'.join(report_lines))

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write(sum_csv, arcname='batch_summary.csv')
        zf.write(report_path, arcname='processing_report.txt')
        for name in os.listdir(out_dir):
            if name.endswith('.pdf'):
                zf.write(os.path.join(out_dir, name), arcname=name)

    job['status'] = 'done'
    job['zip_path'] = zip_path
    job['zip_name'] = zip_name
    job['ok_count'] = ok_count
    job['summary_rows'] = summary_rows


def _run_job(app, job_id):
    with app.app_context():
        try:
            job = _jobs.get(job_id)
            if job and job.get('job_kind') == 'pdf':
                _run_pdf_batch_inner(app, job_id)
            else:
                _run_job_inner(app, job_id)
        finally:
            db.session.remove()


def _run_job_inner(app, job_id):
    job = _jobs.get(job_id)
    if not job:
        return
    uid = job['user_id']
    csv_path = job.get('csv_path')
    out_dir = job['out_dir']
    defaults = job.get('defaults') or {}

    summary_rows = []
    ok_count = 0
    user = User.query.get(uid)
    if not user:
        job['status'] = 'error'
        job['error'] = 'User not found'
        return

    rows = []
    if job.get('rows') is not None:
        rows = [_normalize_row_keys(r) for r in (job.get('rows') or [])]
    else:
        if not csv_path:
            job['status'] = 'error'
            job['error'] = 'No CSV file or rows provided'
            return
        try:
            with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
                raw = f.read()
            reader = csv.DictReader(io.StringIO(raw))
            rows = [_normalize_row_keys(r) for r in reader]
        except Exception as e:
            job['status'] = 'error'
            job['error'] = str(e)
            return

    if len(rows) > MAX_BATCH_ROWS:
        job['status'] = 'error'
        job['error'] = f'Maximum {MAX_BATCH_ROWS} rows allowed'
        return

    if not rows:
        job['status'] = 'error'
        job['error'] = 'No data rows'
        return

    job['total'] = len(rows)
    job['status'] = 'running'

    for i, row in enumerate(rows):
        job['current'] = i + 1
        rnum = i + 1
        row = _normalize_row_keys(row)
        ep, err = _row_to_ephemeral_appeal(row, defaults, i)
        claim_hint = str(_gval(row, 'claim_number', ('claim_id',)) or '').strip() or '—'

        if err:
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': '',
                    'claim_number': claim_hint,
                    'status': 'skipped',
                    'reason': err,
                    'seconds': '',
                }
            )
            continue

        allowed, _sub, used_free = CreditManager.try_begin_generation(uid)
        if not allowed:
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': '',
                    'claim_number': ep.claim_number,
                    'status': 'error',
                    'reason': 'no credits remaining',
                    'seconds': '',
                }
            )
            job['error'] = (
                f'Insufficient credits at row {rnum} — partial ZIP contains rows processed before this point'
            )
            break

        try:
            t0 = time.perf_counter()
            if not getattr(advanced_ai_generator, 'enabled', True):
                text = f"Batch appeal draft for claim {ep.claim_number}\n\n{ep.denial_reason}"
            else:
                text = advanced_ai_generator.generate_appeal_content(ep)
            ep.generated_letter_text = text
            pdf_bytes = build_professional_pdf_bytes(ep)
            fname = build_appeal_pdf_filename(ep)
            safe = re.sub(r'[^\w\-.]+', '_', fname)
            stem, ext = os.path.splitext(safe)
            if not ext:
                ext = '.pdf'
            safe_unique = f'{stem}_r{rnum}{ext}'
            pdf_path = os.path.join(out_dir, safe_unique)
            with open(pdf_path, 'wb') as out:
                out.write(pdf_bytes)
            ok_count += 1
            job['ok_count'] = ok_count
            elapsed = time.perf_counter() - t0
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': '',
                    'claim_number': ep.claim_number,
                    'status': 'ok',
                    'reason': '',
                    'seconds': round(elapsed, 2),
                }
            )
            CreditManager.increment_usage(uid, used_free_trial=used_free)
            usage_stats = CreditManager.get_usage_stats(uid)
            sub_id = getattr(user, 'stripe_subscription_id', None)
            if (
                usage_stats
                and usage_stats.get('overage_count', 0) > 0
                and sub_id
                and not used_free
            ):
                try:
                    StripeBilling.report_overage_usage(uid, quantity=1)
                except Exception:
                    pass
        except Exception as e:
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': '',
                    'claim_number': ep.claim_number,
                    'status': 'error',
                    'reason': str(e)[:500],
                    'seconds': '',
                }
            )

    _finalize_batch_zip(job, summary_rows, ok_count, 'csv')


def _run_pdf_batch_inner(app, job_id):
    job = _jobs.get(job_id)
    if not job:
        return
    uid = job['user_id']
    out_dir = job['out_dir']
    defaults = job.get('defaults') or {}
    items = job.get('pdf_items') or []

    summary_rows = []
    ok_count = 0
    try:
        _run_pdf_batch_inner_core(job, uid, out_dir, defaults, items, summary_rows)
    finally:
        td = job.get('pdf_temp_dir')
        if td and os.path.isdir(td):
            shutil.rmtree(td, ignore_errors=True)


def _run_pdf_batch_inner_core(job, uid, out_dir, defaults, items, summary_rows):
    ok_count = 0
    user = User.query.get(uid)
    if not user:
        job['status'] = 'error'
        job['error'] = 'User not found'
        return

    if len(items) > MAX_PDF_BATCH_FILES:
        job['status'] = 'error'
        job['error'] = f'Maximum {MAX_PDF_BATCH_FILES} PDF files per batch'
        return
    if not items:
        job['status'] = 'error'
        job['error'] = 'No PDF files uploaded'
        return

    job['total'] = len(items)
    job['status'] = 'running'

    for i, item in enumerate(items):
        job['current'] = i + 1
        rnum = i + 1
        path = item.get('path')
        label = item.get('name') or (os.path.basename(path) if path else f'file_{rnum}')

        parse = None
        err_msg = None
        try:
            parse = parse_denial_pdf(path)
        except ValueError as e:
            err_msg = str(e)
        except Exception as e:
            err_msg = str(e)[:500]

        if err_msg:
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': label,
                    'claim_number': '—',
                    'status': 'skipped',
                    'reason': f'extraction failed: {err_msg}',
                    'seconds': '',
                }
            )
            continue

        if not parse.get('success'):
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': label,
                    'claim_number': '—',
                    'status': 'skipped',
                    'reason': str(parse.get('error') or parse.get('message') or 'extraction failed'),
                    'seconds': '',
                }
            )
            continue

        ep, perr = _parse_pdf_to_ephemeral(parse, defaults, i, label)
        if perr:
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': label,
                    'claim_number': '—',
                    'status': 'skipped',
                    'reason': perr,
                    'seconds': '',
                }
            )
            continue

        allowed, _sub, used_free = CreditManager.try_begin_generation(uid)
        if not allowed:
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': label,
                    'claim_number': ep.claim_number,
                    'status': 'error',
                    'reason': 'no credits remaining',
                    'seconds': '',
                }
            )
            job['error'] = (
                f'Insufficient credits at file {rnum} — partial ZIP contains appeals generated before this point'
            )
            break

        try:
            t0 = time.perf_counter()
            if not getattr(advanced_ai_generator, 'enabled', True):
                text = f"Batch appeal draft for claim {ep.claim_number}\n\n{ep.denial_reason}"
            else:
                text = advanced_ai_generator.generate_appeal_content(ep)
            ep.generated_letter_text = text
            pdf_bytes = build_professional_pdf_bytes(ep)
            fname = build_appeal_pdf_filename(ep)
            safe = re.sub(r'[^\w\-.]+', '_', fname)
            stem, ext = os.path.splitext(safe)
            if not ext:
                ext = '.pdf'
            safe_unique = f'{stem}_r{rnum}{ext}'
            pdf_path = os.path.join(out_dir, safe_unique)
            with open(pdf_path, 'wb') as out:
                out.write(pdf_bytes)
            ok_count += 1
            job['ok_count'] = ok_count
            elapsed = time.perf_counter() - t0
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': label,
                    'claim_number': ep.claim_number,
                    'status': 'ok',
                    'reason': '',
                    'seconds': round(elapsed, 2),
                }
            )
            CreditManager.increment_usage(uid, used_free_trial=used_free)
            usage_stats = CreditManager.get_usage_stats(uid)
            sub_id = getattr(user, 'stripe_subscription_id', None)
            if (
                usage_stats
                and usage_stats.get('overage_count', 0) > 0
                and sub_id
                and not used_free
            ):
                try:
                    StripeBilling.report_overage_usage(uid, quantity=1)
                except Exception:
                    pass
        except Exception as e:
            summary_rows.append(
                {
                    'row': rnum,
                    'source_file': label,
                    'claim_number': ep.claim_number,
                    'status': 'error',
                    'reason': str(e)[:500],
                    'seconds': '',
                }
            )

    _finalize_batch_zip(job, summary_rows, ok_count, 'pdf_multi')


def _base_job_dict(user_id, out_dir, defaults):
    return {
        'user_id': user_id,
        'out_dir': out_dir,
        'defaults': defaults or {},
        'status': 'queued',
        'total': 0,
        'current': 0,
        'ok_count': 0,
        'error': None,
        'zip_path': None,
        'zip_name': None,
        'summary_rows': [],
        'job_kind': 'csv',
        'csv_path': None,
        'rows': None,
        'pdf_items': None,
        'pdf_temp_dir': None,
    }


def start_batch_job(app, user_id, csv_path, defaults=None):
    job_id = uuid.uuid4().hex
    out_dir = os.path.join(app.config['GENERATED_FOLDER'], f'batch_{job_id}')
    os.makedirs(out_dir, exist_ok=True)
    job = _base_job_dict(user_id, out_dir, defaults)
    job['csv_path'] = csv_path
    job['job_kind'] = 'csv'
    with _jobs_lock:
        _jobs[job_id] = job
    t = threading.Thread(target=_run_job, args=(app, job_id), daemon=True)
    t.start()
    return job_id


def start_batch_job_from_rows(app, user_id, rows, defaults=None):
    job_id = uuid.uuid4().hex
    out_dir = os.path.join(app.config['GENERATED_FOLDER'], f'batch_{job_id}')
    os.makedirs(out_dir, exist_ok=True)
    job = _base_job_dict(user_id, out_dir, defaults)
    job['rows'] = list(rows or [])
    job['job_kind'] = 'csv'
    with _jobs_lock:
        _jobs[job_id] = job
    t = threading.Thread(target=_run_job, args=(app, job_id), daemon=True)
    t.start()
    return job_id


def start_pdf_batch_job(app, user_id, pdf_items, defaults=None, pdf_temp_dir=None):
    job_id = uuid.uuid4().hex
    out_dir = os.path.join(app.config['GENERATED_FOLDER'], f'batch_{job_id}')
    os.makedirs(out_dir, exist_ok=True)
    job = _base_job_dict(user_id, out_dir, defaults)
    job['pdf_items'] = list(pdf_items or [])
    job['job_kind'] = 'pdf'
    job['pdf_temp_dir'] = pdf_temp_dir
    with _jobs_lock:
        _jobs[job_id] = job
    t = threading.Thread(target=_run_job, args=(app, job_id), daemon=True)
    t.start()
    return job_id


def get_job(job_id):
    with _jobs_lock:
        return _jobs.get(job_id)
