"""Offline, original Kairon examples. No network, real accounts or persisted secrets."""
import argparse
import hmac
import json
import secrets
import sqlite3


def sessions():
    token = secrets.token_urlsafe(32)
    store = {token: {"user": "learner-a", "expires": 120}}
    def allowed(value, now):
        record = store.get(value)
        return bool(record and now < record["expires"])
    print("before_login=denied")
    print("after_login=" + ("allowed" if allowed(token, 100) else "denied"))
    store.pop(token)
    print("after_logout=" + ("allowed" if allowed(token, 101) else "denied"))
    # The expiry comparison uses a separate session; logout never revives token.
    expiry_token = secrets.token_urlsafe(32)
    store[expiry_token] = {"user": "learner-a", "expires": 120}
    print("after_expiry=" + ("allowed" if allowed(expiry_token, 121) else "denied"))
    print("old_session=" + ("active" if allowed(token, 101) else "revoked"))


def authentication():
    # This models decisions after password/MFA verification; it stores no passwords.
    def decide(password_ok, second_factor_ok, enrolled):
        if not password_ok:
            return "denied"
        if enrolled and not second_factor_ok:
            return "need_mfa"
        return "allowed"
    print("wrong_password=" + decide(False, False, True))
    print("password_only=" + decide(True, False, True))
    print("password_and_second_factor=" + decide(True, True, True))
    print("missing_step=mfa")


def authorization():
    orders = {"order-a": {"owner": "learner-a", "boxes": 3},
              "order-b": {"owner": "learner-b", "boxes": 5}}
    actor = "learner-a"  # Comes from the already verified session, not request JSON.
    def read_order(order_id):
        order = orders.get(order_id)
        if order is None:
            return 404, None
        if order["owner"] != actor:
            return 403, None
        return 200, {"boxes": order["boxes"]}
    for requested in ("order-a", "order-b", "missing"):
        status, body = read_order(requested)
        print(f"actor={actor} order={requested} status={status} body={json.dumps(body)}")


def sql():
    db = sqlite3.connect(":memory:")
    try:
        db.execute("CREATE TABLE orders (owner TEXT, boxes INTEGER)")
        db.executemany("INSERT INTO orders VALUES (?, ?)", [("learner-a", 3), ("learner-b", 5)])
        normal = "learner-a"
        # An inert string in this offline SQLite database; never sent to a site.
        mixed = "' OR 1=1 --"
        for label, value in (("normal", normal), ("sql_like_text", mixed)):
            rows = db.execute("SELECT boxes FROM orders WHERE owner = ?", (value,)).fetchall()
            print(f"parameterized_{label}_rows={len(rows)}")
        # Deliberately bad code is confined to an in-memory, two-row teaching DB.
        unsafe = "SELECT boxes FROM orders WHERE owner = '" + mixed + "'"
        print("unsafe_sql_like_text_rows=" + str(len(db.execute(unsafe).fetchall())))
        print("database_saved_to_disk=false")
    finally:
        db.close()


def csrf():
    expected_token = secrets.token_urlsafe(32)
    def accept(origin_ok, supplied_token):
        return origin_ok and isinstance(supplied_token, str) and hmac.compare_digest(expected_token, supplied_token)
    for label, origin_ok, token in (("foreign_form", False, None),
                                    ("same_origin_missing_token", True, None),
                                    ("same_origin_wrong_token", True, "wrong"),
                                    ("same_origin_correct_token", True, expected_token)):
        print(label + "=" + ("allowed" if accept(origin_ok, token) else "denied"))
    print("required_check=csrf-token")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("case", choices=["sessions", "authentication", "authorization", "sql", "csrf"])
    selected = parser.parse_args().case
    {"sessions": sessions, "authentication": authentication, "authorization": authorization,
     "sql": sql, "csrf": csrf}[selected]()


if __name__ == "__main__":
    main()
