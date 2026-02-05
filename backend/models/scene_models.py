from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class Scene(BaseModel):
    scene: int
    text: str
    description: str

class ProcessingStatus(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    job_id: str
    stage: str  # starting, dividing, generating, completed, error
    progress: float  # 0-100
    message: str
    timestamp: datetime = datetime.now()
    result: Optional['PipelineResult'] = None
    
    def update_status(self, stage: str, progress: float, message: str):
        self.stage = stage
        self.progress = progress
        self.message = message
        self.timestamp = datetime.now()

class SceneResult(BaseModel):
    scene: int
    text: str
    description: str
    audio_url: str
    video_url: str

class PipelineResult(BaseModel):
    scenes: List[SceneResult]