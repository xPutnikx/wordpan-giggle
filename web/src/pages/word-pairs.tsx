import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useWordPairs } from '@/hooks/use-word-pairs'
import { useTranslationSuggestions } from '@/hooks/use-translation-suggestions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Trash2, CheckCircle2, Circle, Sparkles } from 'lucide-react'

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  it: 'Italian',
  ko: 'Korean',
}

type FilterType = 'all' | 'mastered' | 'learning'
type SortType = 'date' | 'accuracy' | 'practiced'

export default function WordPairsPage() {
  const { profile } = useUser()
  const {
    wordPairs,
    loading,
    error,
    fetchWordPairs,
    addWordPair,
    deleteWordPair,
    toggleMastered,
    statistics,
  } = useWordPairs()
  const { suggestions, loading: suggestionsLoading, getSuggestions, clearSuggestions } = useTranslationSuggestions()

  const [sourceWord, setSourceWord] = useState('')
  const [selectedTranslation, setSelectedTranslation] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('date')
  const [adding, setAdding] = useState(false)

  const nativeLanguage = profile?.native_language
  const targetLanguage = profile?.target_language
  const nativeLanguageName = nativeLanguage ? LANGUAGE_NAMES[nativeLanguage] || nativeLanguage : null
  const targetLanguageName = targetLanguage ? LANGUAGE_NAMES[targetLanguage] || targetLanguage : null

  useEffect(() => {
    fetchWordPairs()
  }, [fetchWordPairs])

  const handleGetSuggestions = async () => {
    if (!sourceWord.trim()) {
      toast.error('Please enter a word')
      return
    }
    if (!nativeLanguage || !targetLanguage) {
      toast.error('Please set your native and target languages in your profile')
      return
    }
    await getSuggestions(sourceWord.trim())
  }

  const handleAddWordPair = async () => {
    if (!sourceWord.trim() || !selectedTranslation) {
      toast.error('Please select a translation')
      return
    }

    setAdding(true)
    try {
      await addWordPair(sourceWord.trim(), selectedTranslation)
      toast.success('Word pair added to your dictionary')
      setSourceWord('')
      setSelectedTranslation(null)
      clearSuggestions()
    } catch (err) {
      toast.error('Failed to add word pair')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this word pair?')) {
      return
    }

    try {
      await deleteWordPair(id)
      toast.success('Word pair removed')
    } catch (err) {
      toast.error('Failed to remove word pair')
    }
  }

  const handleToggleMastered = async (id: string, currentMastered: boolean) => {
    try {
      await toggleMastered(id, !currentMastered)
      toast.success(currentMastered ? 'Marked as learning' : 'Marked as mastered')
    } catch (err) {
      toast.error('Failed to update mastered status')
    }
  }

  // Filter word pairs
  const filteredPairs = wordPairs.filter((pair) => {
    if (filter === 'mastered') return pair.mastered
    if (filter === 'learning') return !pair.mastered
    return true
  })

  // Sort word pairs
  const sortedPairs = [...filteredPairs].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sortBy === 'accuracy') {
      const accuracyA = a.times_practiced > 0 ? a.times_correct / a.times_practiced : 0
      const accuracyB = b.times_practiced > 0 ? b.times_correct / b.times_practiced : 0
      return accuracyB - accuracyA
    }
    if (sortBy === 'practiced') {
      return b.times_practiced - a.times_practiced
    }
    return 0
  })

  const calculateAccuracy = (pair: typeof wordPairs[0]) => {
    if (pair.times_practiced === 0) return 0
    return Math.round((pair.times_correct / pair.times_practiced) * 100)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Statistics Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Words</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Mastered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.mastered}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statistics.learning}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Overall Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.accuracy}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {statistics.totalCorrect} / {statistics.totalPracticed} correct
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Word Pair Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Word Pair</CardTitle>
            <CardDescription>
              {nativeLanguageName && targetLanguageName
                ? `Add words from ${nativeLanguageName} to ${targetLanguageName}`
                : 'Set your languages in your profile to add word pairs'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="source-word">Source Word ({nativeLanguageName || 'Native'})</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="source-word"
                    value={sourceWord}
                    onChange={(e) => setSourceWord(e.target.value)}
                    placeholder="Enter word in your native language"
                    disabled={!nativeLanguage || !targetLanguage || adding}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && sourceWord.trim() && !suggestions.length) {
                        handleGetSuggestions()
                      }
                    }}
                  />
                  <Button
                    onClick={handleGetSuggestions}
                    disabled={!sourceWord.trim() || !nativeLanguage || !targetLanguage || suggestionsLoading || adding}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get Translations
                  </Button>
                </div>
              </Field>

              {/* Translation Suggestions */}
              {suggestions.length > 0 && (
                <Field>
                  <FieldLabel>Select Translation ({targetLanguageName || 'Target'})</FieldLabel>
                  <div className="grid gap-2 md:grid-cols-3">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedTranslation(suggestion.translation)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          selectedTranslation === suggestion.translation
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium text-lg mb-1">{suggestion.translation}</div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">{suggestion.context}</div>
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              {suggestionsLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              )}

              <Field>
                <Button
                  onClick={handleAddWordPair}
                  disabled={!selectedTranslation || adding || !nativeLanguage || !targetLanguage}
                  className="w-full"
                >
                  {adding ? 'Adding...' : 'Add to Dictionary'}
                </Button>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Word Pairs List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Dictionary</CardTitle>
                <CardDescription>
                  {sortedPairs.length} word pair{sortedPairs.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as FilterType)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All</option>
                  <option value="mastered">Mastered</option>
                  <option value="learning">Learning</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortType)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="date">Sort by Date</option>
                  <option value="accuracy">Sort by Accuracy</option>
                  <option value="practiced">Sort by Times Practiced</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading word pairs...</p>
              </div>
            ) : sortedPairs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">
                  {filter === 'all' ? 'No word pairs yet. Add your first word pair above!' : `No ${filter} word pairs.`}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Word</TableHead>
                      <TableHead>Translation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Statistics</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPairs.map((pair) => (
                      <TableRow key={pair.id}>
                        <TableCell className="font-medium">{pair.source_word}</TableCell>
                        <TableCell>{pair.target_word}</TableCell>
                        <TableCell>
                          {pair.mastered ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Mastered
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Circle className="mr-1 h-3 w-3" />
                              Learning
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="text-sm">
                              Practiced: <strong>{pair.times_practiced}</strong>
                            </div>
                            <div className="text-sm">
                              Correct: <strong className="text-green-600">{pair.times_correct}</strong> / Wrong:{' '}
                              <strong className="text-red-600">{pair.times_wrong}</strong>
                            </div>
                            {pair.times_practiced > 0 && (
                              <div className="text-sm">
                                Accuracy: <strong>{calculateAccuracy(pair)}%</strong>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleMastered(pair.id, pair.mastered)}
                              title={pair.mastered ? 'Mark as learning' : 'Mark as mastered'}
                            >
                              {pair.mastered ? <Circle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(pair.id)}
                              title="Remove word pair"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

