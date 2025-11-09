import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useProfile } from '@/hooks/use-profile'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// Language options: 10 most popular languages
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'it', name: 'Italian' },
  { code: 'ko', name: 'Korean' },
]

export default function ProfilePage() {
  const { user, refreshProfile } = useUser()
  const { profile, loading, error, fetchProfile, updateProfile } = useProfile()
  const [nativeLanguage, setNativeLanguage] = useState<string>('')
  const [targetLanguage, setTargetLanguage] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Update local state when profile loads
  useEffect(() => {
    if (profile) {
      setNativeLanguage(profile.native_language || '')
      setTargetLanguage(profile.target_language || '')
    }
  }, [profile])

  const handleSave = async () => {
    setValidationError(null)

    // Validate that languages are selected
    if (!nativeLanguage || !targetLanguage) {
      setValidationError('Please select both native and target languages')
      return
    }

    // Validate that languages are different
    if (nativeLanguage === targetLanguage) {
      setValidationError('Native and target languages must be different')
      return
    }

    setSaving(true)
    try {
      await updateProfile({
        native_language: nativeLanguage,
        target_language: targetLanguage,
      })
      // Refresh profile in UserContext
      await refreshProfile()
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error('Failed to update profile')
      console.error('Error updating profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const userEmail = user?.email || ''

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Manage your profile settings and language preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Display */}
            <Field>
              <FieldLabel>Email</FieldLabel>
              {loading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <div className="px-3 py-2 text-sm bg-muted rounded-md border">
                  {userEmail}
                </div>
              )}
              <FieldDescription>
                Your email address cannot be changed here
              </FieldDescription>
            </Field>

            {/* Native Language Selection */}
            <Field>
              <FieldLabel htmlFor="native-language">Native Language</FieldLabel>
              {loading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={nativeLanguage}
                  onValueChange={setNativeLanguage}
                  disabled={saving}
                >
                  <SelectTrigger id="native-language" className="w-full">
                    <SelectValue placeholder="Select your native language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FieldDescription>
                The language you speak natively
              </FieldDescription>
            </Field>

            {/* Target Language Selection */}
            <Field>
              <FieldLabel htmlFor="target-language">Target Language</FieldLabel>
              {loading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={targetLanguage}
                  onValueChange={setTargetLanguage}
                  disabled={saving}
                >
                  <SelectTrigger id="target-language" className="w-full">
                    <SelectValue placeholder="Select the language you want to learn" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FieldDescription>
                The language you want to learn
              </FieldDescription>
            </Field>

            {/* Validation Error */}
            {validationError && (
              <FieldError>{validationError}</FieldError>
            )}

            {/* API Error */}
            {error && (
              <FieldError>{error.message}</FieldError>
            )}

            {/* Save Button */}
            <Field>
              <Button
                onClick={handleSave}
                disabled={loading || saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

