export interface Table {
  id: number
  name: string
  seats: number
  enabled: boolean
}

export interface Attendee {
  id: string
  name: string
  image?: string
  isKorean: boolean
}

export type TableAssignations = Record<Table['id'], Array<Attendee['id']>>
