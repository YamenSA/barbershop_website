from pydantic import BaseModel

class RetentionResultOut(BaseModel):
    mode: str
    anonymized_customers: int
    anonymized_guest_appointments: int
