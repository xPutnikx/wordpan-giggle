import { useState, useCallback } from 'react'
import { getTranslationSuggestions, type TranslationSuggestion } from '@/lib/ai-service'

export interface UseTranslationSuggestionsReturn {
  suggestions: TranslationSuggestion[]
  loading: boolean
  error: Error | null
  getSuggestions: (word: string) => Promise<void>
  clearSuggestions: () => void
}

/**
 * Custom hook to get AI-powered translation suggestions
 */
export function useTranslationSuggestions(): UseTranslationSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<TranslationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const getSuggestions = useCallback(async (word: string) => {
    if (!word.trim()) {
      setSuggestions([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await getTranslationSuggestions(word.trim())
      setSuggestions(response.suggestions || [])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      console.error('Error getting translation suggestions:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setError(null)
  }, [])

  return {
    suggestions,
    loading,
    error,
    getSuggestions,
    clearSuggestions,
  }
}

