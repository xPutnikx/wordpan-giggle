import asyncio
import os
import warnings
from functools import wraps
from typing import Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

from crews.random_phrase_crew.crew import RandomPhraseCrew
from crews.random_phrase_crew.schemas import PhraseOutput
from crews.translation_crew.crew import TranslationCrew
from crews.translation_crew.schemas import TranslationSuggestionsOutput

from lib.tracer import traceable

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

# Initialize Flask app
app = Flask(__name__)

# Configure CORS - allow requests from localhost frontend
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",  # Vite dev server
            "http://localhost:3000",  # Alternative port
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def require_auth(f):
    """
    Decorator to require authentication for endpoints.
    Validates the JWT token from the Authorization header.
    """
    @wraps(f)
    async def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Authorization header is required"}), 401

        # Extract token from "Bearer <token>" format
        try:
            token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        except IndexError:
            return jsonify({"error": "Invalid authorization header format"}), 401

        try:
            # Verify the JWT token with Supabase
            user_response = supabase.auth.get_user(token)
            request.user = user_response.user
        except Exception as e:
            return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

        return await f(*args, **kwargs)

    return decorated_function


async def get_user_context(user_id: str) -> Optional[str]:
    """
    Fetch user context from Supabase.

    Args:
        user_id: The user's UUID

    Returns:
        User context string or None if not found
    """
    try:
        # Fetch user context from the profiles table
        response = supabase.table("profiles").select("context").eq("id", user_id).single().execute()

        if response.data:
            return response.data.get("context", "")
        return None
    except Exception as e:
        print(f"Error fetching user context: {e}")
        return None


async def get_user_profile(user_id: str, auth_token: str) -> Optional[dict]:
    """
    Fetch user profile including language preferences from Supabase.

    Args:
        user_id: The user's UUID
        auth_token: The user's JWT token for authentication

    Returns:
        Dictionary with profile data including context, native_language, and target_language,
        or None if not found
    """
    try:
        # Create a new Supabase client instance for this authenticated query
        # Set the auth token in headers for RLS policies to work correctly
        authenticated_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Set the authorization header on the postgrest client
        authenticated_client.postgrest.headers["Authorization"] = f"Bearer {auth_token}"
        authenticated_client.postgrest.headers["apikey"] = SUPABASE_ANON_KEY
        
        # Fetch user profile from the profiles table
        response = authenticated_client.table("profiles").select("context, native_language, target_language").eq("id", user_id).single().execute()
        
        if response.data:
            return response.data
        return None
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        return None


@traceable
async def generate_random_phrase(words: list[str], user_context: str, native_language: Optional[str] = None, target_language: Optional[str] = None) -> PhraseOutput:
    """
    Generate a random phrase using the RandomPhraseCrew.

    Args:
        words: List of words to use in the phrase
        user_context: User context to personalize the phrase
        native_language: User's native language code (optional)
        target_language: User's target language code (optional)

    Returns:
        PhraseOutput with phrase and words used
    """
    # Language code to name mapping
    LANGUAGE_NAMES = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'zh': 'Chinese (Simplified)',
        'ja': 'Japanese',
        'it': 'Italian',
        'ko': 'Korean',
    }
    
    # Format inputs for the crew
    words_str = ', '.join(words) if isinstance(words, list) else str(words)
    
    # Format language information for the YAML template
    if native_language:
        native_lang_name = LANGUAGE_NAMES.get(native_language, native_language)
        native_lang_str = f'Native language: {native_lang_name} ({native_language})'
    else:
        native_lang_str = '(No native language specified)'
    
    if target_language:
        target_lang_name = LANGUAGE_NAMES.get(target_language, target_language)
        target_lang_str = f'Target language: {target_lang_name} ({target_language}) - Generate the phrase in this language!'
    else:
        target_lang_str = '(No target language specified - generate in English)'
    
    inputs = {
        'words': words_str,
        'user_context': user_context or '',
        'native_language': native_lang_str,
        'target_language': target_lang_str
    }

    result = await RandomPhraseCrew().crew().kickoff_async(inputs=inputs)

    # CrewAI returns a result with a .pydantic attribute containing the Pydantic model
    if hasattr(result, 'pydantic'):
        return result.pydantic

    # Fallback - return a basic PhraseOutput
    return PhraseOutput(phrase=str(result), words=words)


@app.route("/health", methods=["GET"])
async def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200


@app.route("/api/random-phrase", methods=["POST"])
@require_auth
async def get_random_phrase():
    """
    Generate a random phrase based on provided words and user context.

    Request body:
        {
            "words": ["word1", "word2", ...]
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "phrase": "generated phrase",
            "words_used": ["word1", "word2"]
        }
    """
    try:
        # Get words from request body
        data = request.get_json()

        if not data or "words" not in data:
            return jsonify({"error": "Request body must include 'words' array"}), 400

        words = data.get("words", [])

        if not isinstance(words, list) or len(words) == 0:
            return jsonify({"error": "'words' must be a non-empty array"}), 400

        # Get user profile from Supabase (including context and language preferences)
        user_id = request.user.id
        # Extract token for authenticated queries
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else auth_header
        user_profile = await get_user_profile(user_id, token)
        
        # Extract context and language preferences
        user_context = user_profile.get("context", "") if user_profile else ""
        native_language = user_profile.get("native_language") if user_profile else None
        target_language = user_profile.get("target_language") if user_profile else None

        # Generate the phrase (language preferences can be used by the crew)
        result = await generate_random_phrase(words, user_context or "", native_language, target_language)

        return jsonify(result.model_dump()), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@traceable
async def generate_translation_suggestions(word: str, native_language: str, target_language: str) -> TranslationSuggestionsOutput:
    """
    Generate translation suggestions using the TranslationCrew.

    Args:
        word: The word to translate
        native_language: Source language code
        target_language: Target language code

    Returns:
        TranslationSuggestionsOutput with 3 translation suggestions
    """
    # Language code to name mapping
    LANGUAGE_NAMES = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'zh': 'Chinese (Simplified)',
        'ja': 'Japanese',
        'it': 'Italian',
        'ko': 'Korean',
    }
    
    native_lang_name = LANGUAGE_NAMES.get(native_language, native_language)
    target_lang_name = LANGUAGE_NAMES.get(target_language, target_language)
    
    inputs = {
        'word': word,
        'native_language': f'{native_lang_name} ({native_language})',
        'target_language': f'{target_lang_name} ({target_language})'
    }

    result = await TranslationCrew().crew().kickoff_async(inputs=inputs)

    # CrewAI returns a result with a .pydantic attribute containing the Pydantic model
    if hasattr(result, 'pydantic'):
        return result.pydantic

    # Fallback - return empty suggestions
    from crews.translation_crew.schemas import TranslationSuggestion
    return TranslationSuggestionsOutput(
        suggestions=[
            TranslationSuggestion(translation="", confidence=0.0, context="Error generating translations")
        ] * 3
    )


@app.route("/api/translation-suggestions", methods=["POST"])
@require_auth
async def get_translation_suggestions():
    """
    Get AI-powered translation suggestions for a word.

    Request body:
        {
            "word": "source_word"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "suggestions": [
                {
                    "translation": "translation1",
                    "confidence": 0.95,
                    "context": "Most common usage..."
                },
                ...
            ]
        }
    """
    try:
        data = request.get_json()

        if not data or "word" not in data:
            return jsonify({"error": "Request body must include 'word' string"}), 400

        word = data.get("word", "").strip()

        if not word:
            return jsonify({"error": "'word' must be a non-empty string"}), 400

        # Get user profile to get language preferences
        user_id = request.user.id
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else auth_header
        user_profile = await get_user_profile(user_id, token)
        
        # Extract language preferences
        native_language = user_profile.get("native_language") if user_profile else None
        target_language = user_profile.get("target_language") if user_profile else None

        if not native_language or not target_language:
            return jsonify({"error": "User must set native and target languages in profile"}), 400

        # Generate translation suggestions
        result = await generate_translation_suggestions(word, native_language, target_language)

        return jsonify(result.model_dump()), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/word-pairs", methods=["GET"])
@require_auth
async def get_word_pairs():
    """
    Get all word pairs for the authenticated user.

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "word_pairs": [
                {
                    "id": "...",
                    "source_word": "...",
                    "target_word": "...",
                    "mastered": false,
                    "times_practiced": 0,
                    "times_correct": 0,
                    "times_wrong": 0,
                    "created_at": "...",
                    "updated_at": "..."
                },
                ...
            ]
        }
    """
    try:
        user_id = request.user.id
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else auth_header
        
        # Create authenticated client
        authenticated_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        authenticated_client.postgrest.headers["Authorization"] = f"Bearer {token}"
        authenticated_client.postgrest.headers["apikey"] = SUPABASE_ANON_KEY
        
        # Fetch word pairs - try without order first to debug
        try:
            response = authenticated_client.table("user_word_pairs").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        except Exception as order_error:
            # If order fails, try without ordering
            print(f"Order failed, trying without order: {order_error}")
            response = authenticated_client.table("user_word_pairs").select("*").eq("user_id", user_id).execute()

        return jsonify({"word_pairs": response.data or []}), 200

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in get_word_pairs: {str(e)}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/word-pairs", methods=["POST"])
@require_auth
async def add_word_pair():
    """
    Add a new word pair to user's dictionary.

    Request body:
        {
            "source_word": "word in native language",
            "target_word": "translation in target language"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "id": "...",
            "source_word": "...",
            "target_word": "...",
            ...
        }
    """
    try:
        data = request.get_json()

        if not data or "source_word" not in data or "target_word" not in data:
            return jsonify({"error": "Request body must include 'source_word' and 'target_word'"}), 400

        source_word = data.get("source_word", "").strip()
        target_word = data.get("target_word", "").strip()

        if not source_word or not target_word:
            return jsonify({"error": "'source_word' and 'target_word' must be non-empty strings"}), 400

        user_id = request.user.id
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else auth_header
        
        # Create authenticated client
        authenticated_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        authenticated_client.postgrest.headers["Authorization"] = f"Bearer {token}"
        authenticated_client.postgrest.headers["apikey"] = SUPABASE_ANON_KEY
        
        # Insert word pair
        response = authenticated_client.table("user_word_pairs").insert({
            "user_id": user_id,
            "source_word": source_word,
            "target_word": target_word
        }).execute()

        if response.data and len(response.data) > 0:
            return jsonify(response.data[0]), 201
        return jsonify({"error": "Failed to create word pair"}), 500

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in add_word_pair: {str(e)}")
        print(f"Traceback: {error_trace}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/word-pairs/<word_pair_id>", methods=["DELETE"])
@require_auth
async def delete_word_pair(word_pair_id: str):
    """
    Delete a word pair from user's dictionary.

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {"success": true}
    """
    try:
        user_id = request.user.id
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else auth_header
        
        # Create authenticated client
        authenticated_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        authenticated_client.postgrest.headers["Authorization"] = f"Bearer {token}"
        authenticated_client.postgrest.headers["apikey"] = SUPABASE_ANON_KEY
        
        # Delete word pair (RLS ensures user can only delete their own)
        response = authenticated_client.table("user_word_pairs").delete().eq("id", word_pair_id).eq("user_id", user_id).execute()

        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/word-pairs/<word_pair_id>/mastered", methods=["PATCH"])
@require_auth
async def toggle_mastered(word_pair_id: str):
    """
    Toggle mastered status for a word pair.

    Request body:
        {
            "mastered": true/false
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        Updated word pair object
    """
    try:
        data = request.get_json()

        if not data or "mastered" not in data:
            return jsonify({"error": "Request body must include 'mastered' boolean"}), 400

        mastered = data.get("mastered", False)
        user_id = request.user.id
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else auth_header
        
        # Create authenticated client
        authenticated_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        authenticated_client.postgrest.headers["Authorization"] = f"Bearer {token}"
        authenticated_client.postgrest.headers["apikey"] = SUPABASE_ANON_KEY
        
        # Update mastered status (RLS ensures user can only update their own)
        response = authenticated_client.table("user_word_pairs").update({
            "mastered": mastered
        }).eq("id", word_pair_id).eq("user_id", user_id).execute()

        if response.data and len(response.data) > 0:
            return jsonify(response.data[0]), 200
        return jsonify({"error": "Word pair not found"}), 404

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/word-pairs/<word_pair_id>/stats", methods=["PATCH"])
@require_auth
async def update_word_pair_stats(word_pair_id: str):
    """
    Update statistics for a word pair (practice session results).

    Request body:
        {
            "correct": true/false  // whether the answer was correct
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        Updated word pair object
    """
    try:
        data = request.get_json()

        if not data or "correct" not in data:
            return jsonify({"error": "Request body must include 'correct' boolean"}), 400

        is_correct = data.get("correct", False)
        user_id = request.user.id
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1] if auth_header and " " in auth_header else auth_header
        
        # Create authenticated client
        authenticated_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        authenticated_client.postgrest.headers["Authorization"] = f"Bearer {token}"
        authenticated_client.postgrest.headers["apikey"] = SUPABASE_ANON_KEY
        
        # First get current stats
        current_response = authenticated_client.table("user_word_pairs").select("times_practiced, times_correct, times_wrong").eq("id", word_pair_id).eq("user_id", user_id).single().execute()
        
        if not current_response.data:
            return jsonify({"error": "Word pair not found"}), 404

        current_practiced = current_response.data.get("times_practiced", 0)
        current_correct = current_response.data.get("times_correct", 0)
        current_wrong = current_response.data.get("times_wrong", 0)

        # Update stats
        update_data = {
            "times_practiced": current_practiced + 1
        }
        
        if is_correct:
            update_data["times_correct"] = current_correct + 1
        else:
            update_data["times_wrong"] = current_wrong + 1

        response = authenticated_client.table("user_word_pairs").update(update_data).eq("id", word_pair_id).eq("user_id", user_id).execute()

        if response.data and len(response.data) > 0:
            return jsonify(response.data[0]), 200
        return jsonify({"error": "Failed to update statistics"}), 500

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


if __name__ == "__main__":
    # Run the Flask app
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
