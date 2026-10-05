from pydantic import BaseModel, Field
from typing import Literal


class RiskStoryRequest(BaseModel):
    force_regenerate: bool = False
    language: str = "en"


class RiskStoryFactor(BaseModel):
    feature: str
    display_name: str
    direction: Literal["increases_risk", "decreases_risk"]
    contribution: float
    value_text: str
    explanation: str


class RiskStoryVessel(BaseModel):
    vessel: Literal["LAD", "LCX", "RCA"]
    risk_percent: float
    severity: Literal["low", "moderate", "high"]


class RiskStoryResponse(BaseModel):
    headline: str = Field(max_length=140)
    summary: str = Field(max_length=600)
    primary_message: str = Field(max_length=300)
    positive_factors: list[RiskStoryFactor]
    negative_factors: list[RiskStoryFactor]
    vessels: list[RiskStoryVessel]
    highest_risk_vessel: Literal["LAD", "LCX", "RCA"] | None = None
    visualization_steps: list[str]
    disclaimer: str
