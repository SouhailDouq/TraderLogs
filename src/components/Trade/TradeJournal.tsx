'use client'

import { useState } from 'react'

interface TradeJournalProps {
  tradeId: string
  initialNotes?: string
  initialTags?: string[]
  initialEmotion?: 'positive' | 'neutral' | 'negative'
  onSave: (data: {
    notes: string
    tags: string[]
    emotion: 'positive' | 'neutral' | 'negative'
  }) => void
}

export default function TradeJournal({
  tradeId,
  initialNotes = '',
  initialTags = [],
  initialEmotion = 'neutral',
  onSave
}: TradeJournalProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [tags, setTags] = useState(initialTags)
  const [emotion, setEmotion] = useState<'positive' | 'neutral' | 'negative'>(initialEmotion)
  const [newTag, setNewTag] = useState('')

  const commonTags = [
    '52W-High',
    'Volume-Spike',
    'News-Driven',
    'Sector-Momentum',
    'Technical-Breakout'
  ]

  const emotions = [
    { value: 'positive', label: '😊 Positive', color: 'bg-green-100 text-green-800' },
    { value: 'neutral', label: '😐 Neutral', color: 'bg-gray-100 text-gray-800' },
    { value: 'negative', label: '😔 Negative', color: 'bg-red-100 text-red-800' }
  ]

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSave = () => {
    onSave({
      notes,
      tags,
      emotion
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Trade Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          rows={4}
          placeholder="What was your thesis? What went well/wrong?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How did you feel?
        </label>
        <div className="flex flex-wrap gap-2">
          {emotions.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setEmotion(value as 'positive' | 'neutral' | 'negative')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                emotion === value ? color : 'bg-gray-50 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Strategy Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add custom tag"
          />
          <button
            onClick={handleAddTag}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
          >
            Add
          </button>
        </div>
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1">Common tags:</div>
          <div className="flex flex-wrap gap-1">
            {commonTags.map(tag => (
              <button
                key={tag}
                onClick={() => !tags.includes(tag) && setTags([...tags, tag])}
                disabled={tags.includes(tag)}
                className={`px-2 py-0.5 text-xs rounded ${
                  tags.includes(tag)
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Journal Entry
        </button>
      </div>
    </div>
  )
}
