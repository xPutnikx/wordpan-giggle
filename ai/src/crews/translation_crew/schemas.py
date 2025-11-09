from pydantic import BaseModel, Field
from typing import List


class TranslationSuggestion(BaseModel):
    """Schema for a single translation suggestion."""
    
    translation: str = Field(
        ...,
        description="The translated word in the target language"
    )
    confidence: float = Field(
        ...,
        description="Confidence score from 0.0 to 1.0 indicating how accurate this translation is",
        ge=0.0,
        le=1.0
    )
    context: str = Field(
        ...,
        description="Brief explanation of when/where this translation is most appropriate"
    )


class TranslationSuggestionsOutput(BaseModel):
    """Schema for the translation suggestions output."""
    
    suggestions: List[TranslationSuggestion] = Field(
        ...,
        description="List of 3 translation suggestions, ordered by confidence (highest first)",
        min_length=3,
        max_length=3
    )

