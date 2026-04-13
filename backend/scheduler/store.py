import json
import os
import uuid
from datetime import datetime

SCHEDULES_FILE = os.path.join(os.path.dirname(__file__), "schedules.json")


def _read() -> list[dict]:
    if not os.path.exists(SCHEDULES_FILE):
        return []
    with open(SCHEDULES_FILE, "r") as f:
        return json.load(f)


def _write(schedules: list[dict]):
    with open(SCHEDULES_FILE, "w") as f:
        json.dump(schedules, f, indent=2)


def list_schedules() -> list[dict]:
    return _read()


def get_schedule(schedule_id: str) -> dict | None:
    for s in _read():
        if s["id"] == schedule_id:
            return s
    return None


def add_schedule(ticker: str, frequency: str, preferred_time: str = "09:00", send_email: bool = True) -> dict:
    schedules = _read()
    # Don't allow duplicate tickers
    for s in schedules:
        if s["ticker"].upper() == ticker.upper():
            raise ValueError(f"Schedule for {ticker.upper()} already exists")

    schedule = {
        "id": str(uuid.uuid4())[:8],
        "ticker": ticker.upper(),
        "frequency": frequency,  # daily, weekly, biweekly, monthly
        "preferred_time": preferred_time,
        "send_email": send_email,
        "enabled": True,
        "last_run": None,
        "created_at": datetime.now().isoformat(),
    }
    schedules.append(schedule)
    _write(schedules)
    return schedule


def update_schedule(schedule_id: str, updates: dict) -> dict | None:
    schedules = _read()
    for i, s in enumerate(schedules):
        if s["id"] == schedule_id:
            allowed = {"frequency", "preferred_time", "send_email", "enabled", "last_run"}
            for k, v in updates.items():
                if k in allowed:
                    schedules[i][k] = v
            _write(schedules)
            return schedules[i]
    return None


def delete_schedule(schedule_id: str) -> bool:
    schedules = _read()
    new_schedules = [s for s in schedules if s["id"] != schedule_id]
    if len(new_schedules) == len(schedules):
        return False
    _write(new_schedules)
    return True


def mark_ran(schedule_id: str):
    update_schedule(schedule_id, {"last_run": datetime.now().isoformat()})
