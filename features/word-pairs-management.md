# Word Pairs Management Feature (Personal Learning Notebook)

## Overview
Create a personal dictionary/learning notebook where users can add word pairs (source word in native language + translation in target language), get AI-powered translation suggestions, track learning progress, and mark words as mastered.

## Database Changes

### 1. Create User Word Pairs Table
**File**: `supabase/migrations/[timestamp]_create_user_word_pairs.sql`
- Table: `user_word_pairs`
- Columns:
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users, with RLS)
  - `source_word` (text) - word in native language
  - `target_word` (text) - translation in target language
  - `mastered` (boolean, default false) - whether user has mastered this word
  - `times_practiced` (integer, default 0) - total practice sessions
  - `times_correct` (integer, default 0) - correct answers
  - `times_wrong` (integer, default 0) - incorrect answers
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- RLS policies: Users can only access their own word pairs
- Indexes: user_id, mastered, created_at

## Backend Changes

### 2. Create Translation Suggestions Crew
**Files**: 
- `ai/src/crews/translation_crew/config/agents.yaml`
- `ai/src/crews/translation_crew/config/tasks.yaml`
- `ai/src/crews/translation_crew/crew.py`
- `ai/src/crews/translation_crew/schemas.py`
- Agent: Translation Expert - provides accurate translations considering context
- Task: Generate 3 translation suggestions for a word
- Output schema: List of 3 translation options with confidence scores

### 3. Add Translation API Endpoint
**File**: `ai/run.py`
- `POST /api/translation-suggestions`
- Request: `{ "word": "source_word", "native_language": "en", "target_language": "es" }`
- Response: `{ "suggestions": ["translation1", "translation2", "translation3"] }`
- Uses user's language preferences from profile
- Returns 3 AI-generated translation options

### 4. Add Word Pairs Management Endpoints
**File**: `ai/run.py`
- `GET /api/word-pairs` - Get user's word pairs with statistics
- `POST /api/word-pairs` - Add new word pair (with selected translation)
- `DELETE /api/word-pairs/<id>` - Remove word pair
- `PATCH /api/word-pairs/<id>/mastered` - Mark as mastered/unmastered
- `PATCH /api/word-pairs/<id>/stats` - Update statistics (times_practiced, correct, wrong)
- All endpoints require authentication and use RLS

## Frontend Changes

### 5. Create Word Pairs Hook
**File**: `web/src/hooks/use-word-pairs.ts`
- `fetchWordPairs()` - Get all user's word pairs
- `addWordPair(sourceWord, targetWord)` - Add new word pair
- `removeWordPair(id)` - Delete word pair
- `markMastered(id, mastered)` - Toggle mastered status
- `updateStats(id, correct, wrong)` - Update practice statistics
- Loading and error state management

### 6. Create Translation Suggestions Hook
**File**: `web/src/hooks/use-translation-suggestions.ts`
- `getSuggestions(word)` - Fetch AI translation suggestions
- Uses user's native/target language from profile
- Returns 3 translation options

### 7. Create Word Pairs Page
**File**: `web/src/pages/word-pairs.tsx`
- Main page for managing personal dictionary
- Sections:
  - **Add Word Pair Form**: Input for source word, button to get AI suggestions, selection of translation
  - **Word Pairs List**: Table/cards showing all word pairs with:
    - Source word (native language)
    - Target word (target language)
    - Mastered badge/indicator
    - Statistics (times practiced, correct, wrong, accuracy %)
    - Actions: Remove, Mark as mastered
  - **Statistics Summary**: Total words, mastered count, overall accuracy
- Filtering: Show all / Show mastered / Show learning
- Sorting: By date, by accuracy, by times practiced

### 8. Add Word Pairs API Service
**File**: `web/src/lib/ai-service.ts` (or new `word-pairs-service.ts`)
- `getTranslationSuggestions(word)` - Call translation API
- `getWordPairs()` - Fetch user's word pairs
- `addWordPair(sourceWord, targetWord)` - Add word pair
- `removeWordPair(id)` - Delete word pair
- `markMastered(id, mastered)` - Update mastered status
- `updateWordPairStats(id, correct, wrong)` - Update statistics

### 9. Add Navigation Link
**Files**: `web/src/components/app-sidebar.tsx` or `web/src/components/nav-documents.tsx`
- Add "My Dictionary" or "Word Pairs" link to navigation
- Route: `/word-pairs`

### 10. Add Route
**File**: `web/src/App.tsx`
- Add `/word-pairs` route to UserLayout routes

### 11. Update Database Types
**File**: `web/src/lib/database.types.ts`
- Add `user_word_pairs` table type definition

## UI/UX Features

### 12. Add Word Pair Form Component
**File**: `web/src/components/word-pair-form.tsx` (optional, or inline in page)
- Input field for source word
- "Get Translations" button
- Display 3 translation suggestions as selectable cards/buttons
- "Add to Dictionary" button (disabled until translation selected)
- Loading states for AI suggestions

### 13. Word Pair Card Component
**File**: `web/src/components/word-pair-card.tsx` (optional)
- Display word pair with statistics
- Mastered badge
- Progress indicators
- Action buttons (remove, toggle mastered)

## Implementation Notes

- Mastery threshold: User can manually mark as mastered (20 correct answers mentioned but manual for now)
- Statistics tracking: Each practice session updates times_practiced, and records correct/wrong
- AI translations: Use CrewAI to generate context-aware translations (not just dictionary lookups)
- RLS policies: Ensure users can only access/modify their own word pairs
- Future: Time-based repetition algorithm will use the statistics data
- Language support: Uses user's native_language and target_language from profile

## Files to Create/Modify

**New Files:**
- `supabase/migrations/[timestamp]_create_user_word_pairs.sql`
- `ai/src/crews/translation_crew/config/agents.yaml`
- `ai/src/crews/translation_crew/config/tasks.yaml`
- `ai/src/crews/translation_crew/crew.py`
- `ai/src/crews/translation_crew/schemas.py`
- `web/src/hooks/use-word-pairs.ts`
- `web/src/hooks/use-translation-suggestions.ts`
- `web/src/pages/word-pairs.tsx`
- `web/src/components/word-pair-form.tsx` (optional)
- `web/src/components/word-pair-card.tsx` (optional)

**Modified Files:**
- `ai/run.py` - Add translation and word pairs endpoints
- `web/src/App.tsx` - Add word-pairs route
- `web/src/lib/database.types.ts` - Add user_word_pairs type
- `web/src/lib/ai-service.ts` - Add translation and word pairs API calls
- `web/src/components/app-sidebar.tsx` or `nav-documents.tsx` - Add navigation link

