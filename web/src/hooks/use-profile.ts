import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: Error | null
  fetchProfile: () => Promise<void>
  updateProfile: (updates: { native_language?: string | null; target_language?: string | null }) => Promise<void>
}

/**
 * Custom hook to fetch and update user profile
 */
export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Fetch profile
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch profile: ${fetchError.message}`)
      }

      setProfile(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates: { native_language?: string | null; target_language?: string | null }) => {
    try {
      setLoading(true)
      setError(null)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Update profile
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          native_language: updates.native_language,
          target_language: updates.target_language,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      setProfile(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred')
      setError(error)
      console.error('Error updating profile:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
  }
}

