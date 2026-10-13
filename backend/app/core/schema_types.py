"""Pydantic datetime types for the API contract (timezone hotfix, B-1).

Output: every instant is serialised in JSON as ISO-8601 with the Berlin offset
(``2026-10-13T09:00:00+02:00``). Python-mode ``model_dump()`` is untouched, so
internal code keeps working with real datetimes.

Two flavours, because the same-looking value means different things:

* ``SalonDatetimeIn``  — request bodies. Aware → instant; NAIVE → Berlin wall time.
* ``SalonDatetimeOut`` — response models validated from ORM objects. NAIVE values
  come from the database driver (SQLite) and mean UTC.
"""
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, PlainSerializer

from app.core.time import as_utc, to_salon, to_utc

_serialize = PlainSerializer(lambda v: to_salon(v).isoformat(), return_type=str, when_used="json")

SalonDatetimeIn = Annotated[datetime, AfterValidator(to_utc), _serialize]
SalonDatetimeOut = Annotated[datetime, AfterValidator(as_utc), _serialize]
