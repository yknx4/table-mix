import { type TableAssignations, type Attendee, type Table } from './types'

export const defaultTables: Table[] = [
  { id: 1, name: '일', enabled: true, seats: 1 },
  { id: 2, name: '이', enabled: true, seats: 1 },
  { id: 3, name: '삼', enabled: true, seats: 1 },
  { id: 4, name: '사', enabled: true, seats: 1 },
  { id: 5, name: '오', enabled: true, seats: 1 },
  { id: 6, name: '육', enabled: true, seats: 1 },
  { id: 7, name: '칠', enabled: true, seats: 1 },
  { id: 8, name: '팔', enabled: true, seats: 1 },
  { id: 9, name: '구', enabled: true, seats: 1 },
  { id: 10, name: '십', enabled: true, seats: 1 }
]

export function assignationsReverseIndex (assignations: TableAssignations, tables: Table[]): Record<Attendee['id'], Table> {
  const result: Record<Attendee['id'], Table> = {}
  Object.entries(assignations).forEach(([tableId, attendees]) => {
    attendees.forEach((attendeeId) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result[attendeeId] = tables.find((table) => table.id === Number(tableId))!
    })
  })
  return result
}
