"""
Unified Stripe checkout + payment verification (single product funnel).
verify-payment is the only endpoint that may set is_paid True after Stripe confirms payment/subscription.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from functools import wraps

import stripe
from flask import Blueprint, request, jsonify, g, current_app, session
from sqlalchemy import func

from models import db, User, SubscriptionPlan, PaymentTransaction
from credit_manager import CreditManager, PricingManager
from session_customer import validate_customer_session

payment_flow_bp = Blueprint('payment_flow', __name__)
flow_logger = logging.getLogger(__name__)

STUCK_PROCESSING = timedelta(minutes=5)

_BAD_SUB_STATUSES = frozenset(
    {'canceled', 'unpaid', 'incomplete_expired', 'incomplete', 'past_due', 'paused'}
)


def _require_customer_session(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        _, err = validate_customer_session()
        if err is not None:
            resp, code = err
            return resp, code
        return f(*args, **kwargs)

    return wrapped


def _origin():
    return request.headers.get('Origin') or current_app.config.get('DOMAIN') or 'http://localhost:3000'


def _session_uid():
    uid = session.get('uid')
    if uid is None:
        return None
    try:
        return int(uid)
    except (TypeError, ValueError):
        return None


def _checkout_session_entitled(sess) -> tuple[bool, str | None]:
    """Returns (entitled, deny_reason) — deny_reason for logging / is_paid=False paths."""
    mode = sess.get('mode')
    st = sess.get('status')
    ps = (sess.get('payment_status') or '').lower()
    if st == 'expired':
        return False, 'expired'
    if mode == 'subscription':
        if st != 'complete':
            return False, 'incomplete'
        if ps not in ('paid', 'no_payment_required'):
            return False, 'unpaid'
        sub_id = sess.get('subscription')
        if not sub_id:
            return False, 'no_subscription'
        try:
            sub = stripe.Subscription.retrieve(sub_id)
        except Exception:
            return False, 'sub_error'
        stt = getattr(sub, 'status', None)
        if stt in ('active', 'trialing'):
            return True, None
        if stt in _BAD_SUB_STATUSES:
            return False, f'sub_{stt}'
        return False, 'sub_not_active'
    if ps == 'paid' and st == 'complete':
        return True, None
    return False, 'unpaid'


def register_unified_payment_routes(app, limiter):
    stripe.api_key = app.config['STRIPE_SECRET_KEY']

    @payment_flow_bp.route('/create-checkout-session', methods=['POST'])
    @limiter.limit('15 per hour')
    def create_checkout_session():
        """Single checkout entry: subscription plans only."""
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or '').strip().lower()
        plan = (data.get('plan') or data.get('tier') or '').strip().lower()
        ptype = (data.get('type') or 'subscription').strip().lower()

        uid = _session_uid()
        user = None
        if uid:
            user = User.query.get(uid)
        if not user and email:
            user = CreditManager.get_or_create_user(email)
        if not user:
            return jsonify({'error': 'email required (or sign in)'}), 400
        if plan not in ('starter', 'core', 'scale'):
            return jsonify({'error': 'invalid plan'}), 400
        if ptype != 'subscription':
            return jsonify({'error': 'invalid type'}), 400

        tier_info = PricingManager.get_subscription_tier(plan)
        if not tier_info:
            return jsonify({'error': 'unknown plan'}), 400

        if not user.stripe_customer_id:
            customer = stripe.Customer.create(email=user.email or email)
            user.stripe_customer_id = customer.id
            db.session.commit()

        sub_plan = SubscriptionPlan.query.filter_by(name=plan).first()
        if not sub_plan:
            return jsonify({'error': 'plan not configured'}), 404

        origin = _origin()
        checkout = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{'price': sub_plan.stripe_price_id, 'quantity': 1}],
            mode='subscription',
            success_url=f'{origin}/success?session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{origin}/pricing',
            metadata={
                'user_id': str(user.id),
                'plan': plan,
                'type': ptype,
            },
        )
        return jsonify({'session_id': checkout.id}), 200

    @payment_flow_bp.route('/verify-payment', methods=['GET'])
    @_require_customer_session
    def verify_payment():
        """Authoritative entitlement: Stripe checkout session + subscription; sets is_paid or explicit False."""
        user = User.query.get(g.current_user_id)
        if not user:
            return jsonify({'success': True, 'pending': True}), 200

        if user.is_paid is True:
            return jsonify({'success': True}), 200

        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']

        if getattr(user, 'payment_verification_status', None) == 'processing':
            oldest = (
                db.session.query(func.min(PaymentTransaction.created_at))
                .filter(
                    PaymentTransaction.user_id == user.id,
                    PaymentTransaction.status == 'processing',
                )
                .scalar()
            )
            if oldest and datetime.utcnow() - oldest > STUCK_PROCESSING:
                user.payment_verification_status = None
                user.is_paid = False
                for txn in (
                    PaymentTransaction.query.filter_by(user_id=user.id, status='processing').all()
                ):
                    txn.status = 'abandoned'
                db.session.commit()
                flow_logger.warning('stuck processing reset user_id=%s', user.id)
                db.session.refresh(user)

        if user.is_paid is True:
            return jsonify({'success': True}), 200

        txns = (
            PaymentTransaction.query.filter_by(user_id=user.id)
            .filter(PaymentTransaction.session_id.isnot(None))
            .order_by(PaymentTransaction.created_at.desc())
            .limit(8)
            .all()
        )
        saw_definitive_failure = False
        for txn in txns:
            sid = (txn.session_id or '').strip()
            if not sid:
                continue
            try:
                s = stripe.checkout.Session.retrieve(sid)
            except Exception:
                db.session.rollback()
                continue
            entitled, reason = _checkout_session_entitled(s)
            if entitled:
                cust = s.get('customer')
                if cust:
                    user.stripe_customer_id = cust
                if s.get('mode') == 'subscription' and s.get('subscription'):
                    user.stripe_subscription_id = s.get('subscription')
                    meta = s.get('metadata') or {}
                    plan = (meta.get('plan') or '').lower()
                    if plan:
                        user.subscription_tier = plan
                        ti = PricingManager.get_subscription_tier(plan)
                        if ti:
                            user.plan_limit = ti['included_appeals']
                user.is_paid = True
                user.payment_verification_status = None
                txn.status = 'succeeded'
                amt_raw = s.get('amount_total')
                if amt_raw is not None and txn.amount is None:
                    txn.amount = Decimal(str(amt_raw)) / Decimal(100)
                db.session.commit()
                flow_logger.info('verify-payment granted user_id=%s session_id=%s', user.id, sid)
                return jsonify({'success': True}), 200
            if reason and reason != 'sub_error':
                if reason == 'expired':
                    saw_definitive_failure = True
                elif reason.startswith('sub_'):
                    saw_definitive_failure = True
                elif reason == 'no_subscription' and s.get('status') == 'complete':
                    saw_definitive_failure = True
                elif reason == 'unpaid' and s.get('status') == 'complete':
                    saw_definitive_failure = True

        try:
            if user.stripe_customer_id:
                subs = stripe.Subscription.list(customer=user.stripe_customer_id, limit=10)
                terminal_bad: list[str | None] = []
                for sub in subs.data or []:
                    full = stripe.Subscription.retrieve(sub.id)
                    stt = getattr(full, 'status', None)
                    if stt in ('active', 'trialing'):
                        user.is_paid = True
                        user.stripe_subscription_id = full.id
                        user.payment_verification_status = None
                        db.session.commit()
                        flow_logger.info('verify-payment granted via subscription user_id=%s', user.id)
                        return jsonify({'success': True}), 200
                    terminal_bad.append(stt)
                if terminal_bad and all(
                    (st in _BAD_SUB_STATUSES or st == 'canceled') for st in terminal_bad if st is not None
                ):
                    user.is_paid = False
                    user.payment_verification_status = None
                    db.session.commit()
                    flow_logger.info(
                        'verify-payment denied terminal subscription statuses user_id=%s statuses=%s',
                        user.id,
                        terminal_bad,
                    )
                    return jsonify({'success': True}), 200
        except Exception as e:
            db.session.rollback()
            flow_logger.warning('verify-payment subscription sync error user_id=%s err=%s', user.id, e)

        if saw_definitive_failure:
            user.is_paid = False
            user.payment_verification_status = None
            db.session.commit()
            flow_logger.info('verify-payment checkout definitive failure user_id=%s', user.id)
            return jsonify({'success': True}), 200

        if getattr(user, 'payment_verification_status', None) == 'processing':
            return jsonify({'success': True, 'pending': True}), 200

        pending_tx = (
            PaymentTransaction.query.filter_by(user_id=user.id)
            .filter(PaymentTransaction.status.in_(('pending', 'processing')))
            .order_by(PaymentTransaction.created_at.desc())
            .first()
        )
        if pending_tx:
            return jsonify({'success': True, 'pending': True}), 200

        if user.is_paid is False:
            return jsonify({'success': True}), 200

        return jsonify({'success': True}), 200

    app.register_blueprint(payment_flow_bp, url_prefix='/api')
