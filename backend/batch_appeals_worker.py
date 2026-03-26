"""
Batch CSV → appeal text + PDFs → ZIP (background job).
"""
import csv
import io
import os
import re
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

MAX_BATCH_ROWS = 50
_jobs_lock = threading.Lock()
_jobs = {}  # job_id -> dict


def _gval(row, key, alt_keys=()):
    if key in row and row[key] not in (None, ''):
        return row[key]
    for k in alt_keys:
        if k in row and row[k] not in (None, ''):
            return row[k]
    return None


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
    carc = str(_gval(row, 'carc_codes', ('carc', 'CARC')) or '').strip()
    rarc = str(_gval(row, 'rarc_codes', ('rarc', 'RARC')) or '').strip()
    mods = str(_gval(row, 'modifiers', ('modifier',)) or '').strip()
    billed = _gval(row, 'billed_amount', ('billed', 'Billed Amount'))
    paid = _gval(row, 'paid_amount', ('paid', 'Paid Amount'))
    lines = [
        'Denial / remittance summary (batch import):',
        f'Claim Number: {claim_number}',
    ]
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
    payer = str(_gval(row, 'payer', ('Payer', 'insurance')) or '').strip()
    if not claim_number or not payer:
        return None, 'claim_number and payer are required'

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

    denial_code = str(_gval(row, 'carc_codes', ('denial_code',)) or '').strip()[:50] or None

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


def _run_job(app, job_id):
    with app.app_context():
        try:
            _run_job_inner(app, job_id)
        finally:
            db.session.remove()


def _run_job_inner(app, job_id):
    job = _jobs.get(job_id)
    if not job:
        return
    uid = job['user_id']
    csv_path = job['csv_path']
    out_dir = job['out_dir']
    defaults = job.get('defaults') or {}

    summary_rows = []
    ok_count = 0
    user = User.query.get(uid)
    if not user:
        job['status'] = 'error'
        job['error'] = 'User not found'
        return

    try:
        with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
            raw = f.read()
        reader = csv.DictReader(io.StringIO(raw))
        rows = list(reader)
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
        job['error'] = 'No data rows in CSV'
        return

    job['total'] = len(rows)
    job['status'] = 'running'

    for i, row in enumerate(rows):
        job['current'] = i + 1
        rnum = i + 1
        claim = str(_gval(row, 'claim_number', ('claim_id',)) or '').strip()

        if not claim or not str(_gval(row, 'payer', ('Payer', 'insurance')) or '').strip():
            summary_rows.append(
                {
                    'row': rnum,
                    'claim_number': claim or '—',
                    'status': 'skipped',
                    'reason': 'missing claim_number or payer',
                }
            )
            continue

        ep, err = _row_to_ephemeral_appeal(row, defaults, i)
        if err:
            summary_rows.append(
                {'row': rnum, 'claim_number': claim, 'status': 'skipped', 'reason': err}
            )
            continue

        allowed, _sub, used_free = CreditManager.try_begin_generation(uid)
        if not allowed:
            summary_rows.append(
                {
                    'row': rnum,
                    'claim_number': claim,
                    'status': 'error',
                    'reason': 'no credits remaining',
                }
            )
            job['error'] = f'Insufficient credits at row {rnum} — partial ZIP contains rows processed before this point'
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
            pdf_path = os.path.join(out_dir, safe)
            with open(pdf_path, 'wb') as out:
                out.write(pdf_bytes)
            ok_count += 1
            job['ok_count'] = ok_count
            elapsed = time.perf_counter() - t0
            summary_rows.append(
                {
                    'row': rnum,
                    'claim_number': claim,
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
                    'claim_number': claim,
                    'status': 'error',
                    'reason': str(e)[:500],
                }
            )

    zip_name = f"appeals_batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
    zip_path = os.path.join(out_dir, zip_name)

    sum_csv = os.path.join(out_dir, 'batch_summary.csv')
    with open(sum_csv, 'w', newline='', encoding='utf-8') as sf:
        w = csv.DictWriter(
            sf,
            fieldnames=['row', 'claim_number', 'status', 'reason', 'seconds'],
        )
        w.writeheader()
        for s in summary_rows:
            w.writerow(
                {
                    'row': s.get('row', ''),
                    'claim_number': s.get('claim_number', ''),
                    'status': s.get('status', ''),
                    'reason': s.get('reason', ''),
                    'seconds': s.get('seconds', ''),
                }
            )

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write(sum_csv, arcname='batch_summary.csv')
        for name in os.listdir(out_dir):
            if name.endswith('.pdf'):
                zf.write(os.path.join(out_dir, name), arcname=name)

    job['status'] = 'done'
    job['zip_path'] = zip_path
    job['zip_name'] = zip_name
    job['ok_count'] = ok_count
    job['summary_rows'] = summary_rows


def start_batch_job(app, user_id, csv_path, defaults=None):
    job_id = uuid.uuid4().hex
    out_dir = os.path.join(app.config['GENERATED_FOLDER'], f'batch_{job_id}')
    os.makedirs(out_dir, exist_ok=True)
    job = {
        'user_id': user_id,
        'csv_path': csv_path,
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
    }
    with _jobs_lock:
        _jobs[job_id] = job

    t = threading.Thread(target=_run_job, args=(app, job_id), daemon=True)
    t.start()
    return job_id


def get_job(job_id):
    with _jobs_lock:
        return _jobs.get(job_id)
