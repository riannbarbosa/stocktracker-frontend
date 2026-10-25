import { createContext, useContext } from 'react'

export const UnreadContext = createContext({ unread: 0, refreshUnread: () => {} })

export function useUnread() {
  return useContext(UnreadContext)
}
