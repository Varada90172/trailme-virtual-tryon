import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict

from .databricks_connection import connection

CATALOG = "ecommerce"
SCHEMA = "trailmedata"
DB = f"{CATALOG}.{SCHEMA}"


def create_user(
    email: str,
    password_hash: str,
    display_name: str,
    role: str = "customer",
    phone: str = "",
    business_name: str = ""
) -> Optional[Dict]:

    cursor = connection.cursor()

    try:
        # Check if user already exists
        cursor.execute(
            f"SELECT * FROM {DB}.users WHERE email = ?",
            (email.lower().strip(),)
        )

        if cursor.fetchone():
            return None

        # Insert user
        cursor.execute(
            f"""
            INSERT INTO {DB}.users
            (email, password_hash, display_name, role, phone, business_name, vendor_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (
                email.lower().strip(),
                password_hash,
                display_name.strip(),
                role,
                phone.strip() or None,
                business_name.strip() or None,
                None,
            ),
        )

        # Get inserted user
        cursor.execute(
            f"SELECT * FROM {DB}.users WHERE email = ?",
            (email.lower().strip(),)
        )

        row = cursor.fetchone()

        if not row:
            return None

        columns = [
            "id",
            "email",
            "password_hash",
            "display_name",
            "role",
            "phone",
            "business_name",
            "vendor_id",
            "created_at",
        ]

        return dict(zip(columns, row))

    except Exception as e:
        print("Databricks Error:", e)
        return None

    finally:
        cursor.close()


def get_user_by_email(email: str) -> Optional[Dict]:
    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            SELECT *
            FROM {DB}.users
            WHERE lower(email) = lower(?)
            """,
            (email.strip(),),
        )

        row = cursor.fetchone()

        if not row:
            return None

        columns = [
            "id",
            "email",
            "password_hash",
            "display_name",
            "role",
            "phone",
            "business_name",
            "vendor_id",
            "created_at",
        ]

        return dict(zip(columns, row))

    finally:
        cursor.close()


def get_user_by_identifier(identifier: str) -> Optional[Dict]:
    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            SELECT *
            FROM {DB}.users
            WHERE lower(email)=lower(?)
               OR upper(vendor_id)=upper(?)
            """,
            (
                identifier.strip(),
                identifier.strip(),
            ),
        )

        row = cursor.fetchone()

        if not row:
            return None

        columns = [
            "id",
            "email",
            "password_hash",
            "display_name",
            "role",
            "phone",
            "business_name",
            "vendor_id",
            "created_at",
        ]

        return dict(zip(columns, row))

    finally:
        cursor.close()

def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)
    created_at = datetime.utcnow()

    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            INSERT INTO {DB}.auth_sessions
            (token, user_id, expires_at, created_at)
            VALUES
            (
                ?,
                ?,
                ?,
                ?
            )
            """,
            (
                token,
                user_id,
                expires_at,
                created_at,
            ),
        )

        return token

    finally:
        cursor.close()


def get_user_by_session(token: str) -> Optional[Dict]:
    cursor = connection.cursor()

    try:
        cursor.execute(f"""
            SELECT {DB}.users.*
            FROM {DB}.auth_sessions
            JOIN {DB}.users
            ON {DB}.auth_sessions.user_id = {DB}.users.id
            WHERE {DB}.auth_sessions.token = ?
            """, (token,))

        row = cursor.fetchone()

        if not row:
            return None

        columns = [
            "id",
            "email",
            "password_hash",
            "display_name",
            "role",
            "phone",
            "business_name",
            "vendor_id",
            "created_at",
        ]

        return dict(zip(columns, row))

    finally:
        cursor.close()


def delete_session(token: str) -> bool:
    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            SELECT token
            FROM {DB}.auth_sessions
            WHERE token = ?
            """,
            (token,),
        )

        if not cursor.fetchone():
            return False

        cursor.execute(
            f"""
            DELETE FROM {DB}.auth_sessions
            WHERE token = ?
            """,
            (token,),
        )

        return True
    except Exception as e:
        print("Databricks Error:", e)
        return False
    finally:
        cursor.close()


def ensure_tryon_session(session_id: str, user_id: int) -> None:
    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            SELECT user_id
            FROM {DB}.tryon_sessions
            WHERE session_id = ?
            """,
            (session_id,),
        )

        row = cursor.fetchone()

        if row:
            if row[0] != user_id:
                raise PermissionError("Session does not belong to this user")
            return

        cursor.execute(
            f"""
            INSERT INTO {DB}.tryon_sessions
            (
                session_id,
                user_id,
                status,
                sale_status,
                created_at,
                updated_at
            )
            VALUES
            (
                ?,
                ?,
                'created',
                'no_action',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            """,
            (session_id, user_id),
        )

    finally:
        cursor.close()


def update_tryon_session(
    session_id: str,
    user_id: int,
    *,
    status: str | None = None,
    product_id: str | None = None,
    error_message: str | None = None,
    sale_status: str | None = None,
) -> None:

    ensure_tryon_session(session_id, user_id)

    cursor = connection.cursor()

    try:
        updates = []
        values = []

        if status is not None:
            updates.append("status = ?")
            values.append(status)

        if product_id is not None:
            updates.append("product_id = ?")
            values.append(product_id)

        if error_message is not None:
            updates.append("error_message = ?")
            values.append(error_message)

        if sale_status is not None:
            updates.append("sale_status = ?")
            values.append(sale_status)

        updates.append("updated_at = CURRENT_TIMESTAMP")

        values.extend([session_id, user_id])

        cursor.execute(
            f"""
            UPDATE {DB}.tryon_sessions
            SET {", ".join(updates)}
            WHERE session_id = ?
            AND user_id = ?
            """,
            tuple(values),
        )

    finally:
        cursor.close()


def get_tryon_session(session_id: str, user_id: int) -> Optional[Dict]:
    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            SELECT *
            FROM {DB}.tryon_sessions
            WHERE session_id = ?
            AND user_id = ?
            """,
            (session_id, user_id),
        )

        row = cursor.fetchone()

        if not row:
            return None

        columns = [
            "session_id",
            "user_id",
            "product_id",
            "status",
            "error_message",
            "sale_status",
            "created_at",
            "updated_at",
        ]

        return dict(zip(columns, row))

    finally:
        cursor.close()


def list_tryon_sessions(user_id: int) -> list[Dict]:
    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            SELECT *
            FROM {DB}.tryon_sessions
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (user_id,),
        )

        rows = cursor.fetchall()

        columns = [
            "session_id",
            "user_id",
            "product_id",
            "status",
            "error_message",
            "sale_status",
            "created_at",
            "updated_at",
        ]

        return [
            dict(zip(columns, row))
            for row in rows
        ]

    finally:
        cursor.close()


def list_vendor_records(table: str, vendor_user_id: int) -> list[Dict]:
    if table not in {"vendor_products", "vendor_customers", "vendor_occasions"}:
        raise ValueError("Unsupported record type")

    import json

    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            SELECT id, payload
            FROM {DB}.{table}
            WHERE vendor_user_id = ?
            ORDER BY updated_at DESC
            """,
            (vendor_user_id,),
        )

        rows = cursor.fetchall()

        return [
            {
                "id": row[0],
                **json.loads(row[1]),
            }
            for row in rows
        ]

    finally:
        cursor.close()


def get_vendor_record(table: str, record_id: str, vendor_user_id: int) -> Optional[Dict]:
    if table not in {"vendor_products", "vendor_customers", "vendor_occasions"}:
        raise ValueError("Unsupported record type")

    import json

    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            SELECT payload
            FROM {DB}.{table}
            WHERE id = ?
            AND vendor_user_id = ?
            """,
            (
                record_id,
                vendor_user_id,
            ),
        )

        row = cursor.fetchone()

        if not row:
            return None

        return {
            "id": record_id,
            **json.loads(row[0]),
        }

    finally:
        cursor.close()


def save_vendor_record(
    table: str,
    record_id: str,
    vendor_user_id: int,
    payload: Dict,
) -> Dict:

    if table not in {"vendor_products", "vendor_customers", "vendor_occasions"}:
        raise ValueError("Unsupported record type")

    import json

    cursor = connection.cursor()

    try:
        encoded = json.dumps(payload)

        cursor.execute(
            f"""
            DELETE FROM {DB}.{table}
            WHERE id = ?
            """,
            (record_id,),
        )

        cursor.execute(
            f"""
            INSERT INTO {DB}.{table}
            (
                id,
                vendor_user_id,
                payload,
                created_at,
                updated_at
            )
            VALUES
            (
                ?,
                ?,
                ?,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            """,
            (
                record_id,
                vendor_user_id,
                encoded,
            ),
        )

        return {
            "id": record_id,
            **payload,
        }

    finally:
        cursor.close()


def delete_vendor_record(
    table: str,
    record_id: str,
    vendor_user_id: int,
) -> bool:

    if table not in {"vendor_products", "vendor_customers", "vendor_occasions"}:
        raise ValueError("Unsupported record type")

    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            SELECT 1
            FROM {DB}.{table}
            WHERE id = ?
            AND vendor_user_id = ?
            """,
            (
                record_id,
                vendor_user_id,
            ),
        )

        if not cursor.fetchone():
            return False

        cursor.execute(
            f"""
            DELETE FROM {DB}.{table}
            WHERE id = ?
            AND vendor_user_id = ?
            """,
            (
                record_id,
                vendor_user_id,
            ),
        )

        return True

    finally:
        cursor.close()


def create_order(
    order_id: str,
    user_id: int,
    product_id: str,
    session_id: str | None,
    customer_id: str | None,
) -> Dict:

    cursor = connection.cursor()

    try:
        cursor.execute(
            f"""
            INSERT INTO {DB}.orders
            (
                id,
                user_id,
                session_id,
                product_id,
                customer_id,
                status,
                created_at
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                'created',
                CURRENT_TIMESTAMP
            )
            """,
            (
                order_id,
                user_id,
                session_id,
                product_id,
                customer_id,
            ),
        )

        return {
            "id": order_id,
            "status": "created",
            "product_id": product_id,
        }

    finally:
        cursor.close()


