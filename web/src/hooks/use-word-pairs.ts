import { useState, useCallback, useEffect } from 'react'
import {
  getWordPairs,
  addWordPair,
  removeWordPair,
  markWordPairMastered,
  updateWordPairStats,
  type WordPair,
} from '@/lib/ai-service'

export interface UseWordPairsReturn {
  wordPairs: WordPair[]
  loading: boolean
  error: Error | null
  fetchWordPairs: () => Promise<void>
  addWordPair: (sourceWord: string, targetWord: string) => Promise<void>
  deleteWordPair: (id: string) => Promise<void>
  toggleMastered: (id: string, mastered: boolean) => Promise<void>
  updateStats: (id: string, correct: boolean) => Promise<void>
  statistics: {
    total: number
    mastered: number
    learning: number
    totalPracticed: number
    totalCorrect: number
    totalWrong: number
    accuracy: number
  }
}

/**
 * Custom hook to manage user's word pairs (personal dictionary)
 */
export function useWordPairs(): UseWordPairsReturn {
  const [wordPairs, setWordPairs] = useState<WordPair[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchWordPairs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await getWordPairs()
      setWordPairs(response.word_pairs || [])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      console.error('Error fetching word pairs:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAddWordPair = useCallback(async (sourceWord: string, targetWord: string) => {
    try {
      setLoading(true)
      setError(null)

      const newWordPair = await addWordPair(sourceWord, targetWord)
      setWordPairs((prev) => [newWordPair, ...prev])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      console.error('Error adding word pair:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDeleteWordPair = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)

      await removeWordPair(id)
      setWordPairs((prev) => prev.filter((wp) => wp.id !== id))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      console.error('Error deleting word pair:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggleMastered = useCallback(async (id: string, mastered: boolean) => {
    try {
      setLoading(true)
      setError(null)

      const updated = await markWordPairMastered(id, mastered)
      setWordPairs((prev) => prev.map((wp) => (wp.id === id ? updated : wp)))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      console.error('Error toggling mastered status:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const handleUpdateStats = useCallback(async (id: string, correct: boolean) => {
    try {
      setError(null)

      const updated = await updateWordPairStats(id, correct)
      setWordPairs((prev) => prev.map((wp) => (wp.id === id ? updated : wp)))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      console.error('Error updating statistics:', error)
      throw error
    }
  }, [])

  // Calculate statistics
  const statistics = {
    total: wordPairs.length,
    mastered: wordPairs.filter((wp) => wp.mastered).length,
    learning: wordPairs.filter((wp) => !wp.mastered).length,
    totalPracticed: wordPairs.reduce((sum, wp) => sum + wp.times_practiced, 0),
    totalCorrect: wordPairs.reduce((sum, wp) => sum + wp.times_correct, 0),
    totalWrong: wordPairs.reduce((sum, wp) => sum + wp.times_wrong, 0),
    accuracy:
      wordPairs.reduce((sum, wp) => sum + wp.times_practiced, 0) > 0
        ? Math.round(
            (wordPairs.reduce((sum, wp) => sum + wp.times_correct, 0) /
              wordPairs.reduce((sum, wp) => sum + wp.times_practiced, 0)) *
              100
          )
        : 0,
  }

  return {
    wordPairs,
    loading,
    error,
    fetchWordPairs,
    addWordPair: handleAddWordPair,
    deleteWordPair: handleDeleteWordPair,
    toggleMastered: handleToggleMastered,
    updateStats: handleUpdateStats,
    statistics,
  }
}

