import { supabase } from './supabase'

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000'

export interface RandomPhraseResponse {
  phrase: string
  words_used: string[]
}

export interface TranslationSuggestion {
  translation: string
  confidence: number
  context: string
}

export interface TranslationSuggestionsResponse {
  suggestions: TranslationSuggestion[]
}

export interface WordPair {
  id: string
  user_id: string
  source_word: string
  target_word: string
  mastered: boolean
  times_practiced: number
  times_correct: number
  times_wrong: number
  created_at: string
  updated_at: string
}

export interface WordPairsResponse {
  word_pairs: WordPair[]
}

/**
 * Generate a random phrase using the AI service
 * @param words - Array of words to use in the phrase
 * @returns Promise with the generated phrase and words used
 */
export async function generateRandomPhrase(words: string[]): Promise<RandomPhraseResponse> {
  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to generate phrases')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/random-phrase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ words }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to generate phrase: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get AI-powered translation suggestions for a word
 * @param word - Word to translate
 * @returns Promise with 3 translation suggestions
 */
export async function getTranslationSuggestions(word: string): Promise<TranslationSuggestionsResponse> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to get translation suggestions')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/translation-suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ word }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to get translation suggestions: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get all word pairs for the current user
 * @returns Promise with user's word pairs
 */
export async function getWordPairs(): Promise<WordPairsResponse> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to get word pairs')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/word-pairs`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to get word pairs: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Add a new word pair to user's dictionary
 * @param sourceWord - Word in native language
 * @param targetWord - Translation in target language
 * @returns Promise with created word pair
 */
export async function addWordPair(sourceWord: string, targetWord: string): Promise<WordPair> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to add word pairs')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/word-pairs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ source_word: sourceWord, target_word: targetWord }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to add word pair: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a word pair from user's dictionary
 * @param id - Word pair ID
 * @returns Promise with success status
 */
export async function removeWordPair(id: string): Promise<{ success: boolean }> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to remove word pairs')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/word-pairs/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to remove word pair: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Mark a word pair as mastered or unmastered
 * @param id - Word pair ID
 * @param mastered - Whether the word is mastered
 * @returns Promise with updated word pair
 */
export async function markWordPairMastered(id: string, mastered: boolean): Promise<WordPair> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to mark word pairs')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/word-pairs/${id}/mastered`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ mastered }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to update mastered status: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Update statistics for a word pair (practice session result)
 * @param id - Word pair ID
 * @param correct - Whether the answer was correct
 * @returns Promise with updated word pair
 */
export async function updateWordPairStats(id: string, correct: boolean): Promise<WordPair> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('User must be authenticated to update word pair statistics')
  }

  const response = await fetch(`${AI_SERVICE_URL}/api/word-pairs/${id}/stats`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ correct }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to update statistics: ${response.statusText}`)
  }

  return response.json()
}
