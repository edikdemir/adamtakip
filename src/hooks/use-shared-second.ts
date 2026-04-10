"use client"

import { useSyncExternalStore } from "react"

let currentSecond = Date.now()
let intervalId: ReturnType<typeof setInterval> | null = null
const listeners = new Set<() => void>()

function emitTick() {
  currentSecond = Date.now()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  if (intervalId === null) {
    intervalId = setInterval(emitTick, 1000)
  }

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

function getSnapshot() {
  return currentSecond
}

export function useSharedSecond() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
