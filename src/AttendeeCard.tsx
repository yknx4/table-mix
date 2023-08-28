import { Avatar, Button, Card, Popconfirm } from 'antd'
import useLocalStorage from '@rehooks/local-storage'
import Meta from 'antd/es/card/Meta'
import { PlusOutlined, MinusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useMemo } from 'react'
import { isEmpty, sample } from 'lodash'
import { type Attendee, type TableAssignations, type Table } from './types'
import { defaultTables, assignationsReverseIndex } from './helpers'

interface AttendeeCardProps {
  attendee: Attendee
  openNotification: (message: string) => void
}
export function AttendeeCard (props: AttendeeCardProps): JSX.Element {
  const [tables] = useLocalStorage('tables', defaultTables)
  const [attendees, setAttendees] = useLocalStorage<Attendee[]>('attendees', [])
  const [assignations, setAssignations] = useLocalStorage<TableAssignations>('assignations', {})
  const [newAssignations] = useLocalStorage<TableAssignations>('next-assignations', {})
  const currentTable = useMemo(() => assignationsReverseIndex(assignations, tables)[props.attendee.id], [assignations, tables, props.attendee.id])
  const nextTable = useMemo(() => assignationsReverseIndex(newAssignations, tables)[props.attendee.id], [newAssignations, tables, props.attendee.id])
  const item = props.attendee
  const toggleLanguage = (attendee: Attendee): void => {
    const currentAttendees = [...attendees]
    const currentAttendee = currentAttendees.find((a) => a.id === attendee.id)
    if (currentAttendee != null) {
      currentAttendee.isKorean = !currentAttendee.isKorean
      setAttendees(currentAttendees)
    }
  }
  const removeFromTable = (attendee: Attendee): void => {
    const currentAssignations = { ...assignations }
    tables.forEach((table) => {
      currentAssignations[table.id] = currentAssignations[table.id] ?? []
      if (currentAssignations[table.id].includes(attendee.id)) {
        currentAssignations[table.id] = currentAssignations[table.id].filter((id) => id !== attendee.id)
      }
    })
    setAssignations(currentAssignations)
  }
  const deleteAttendee = (attendee: Attendee): void => {
    removeFromTable(attendee)
    const attendeesWithoutThis = attendees.filter((a) => a.id !== attendee.id)
    setAttendees(attendeesWithoutThis)
  }
  const addToRandomTable = (attendee: Attendee): void => {
    const currentAssignations = { ...assignations }
    let currentTable: Table | undefined

    tables.forEach((table) => {
      currentAssignations[table.id] = currentAssignations[table.id] ?? []
      if (currentAssignations[table.id].includes(attendee.id)) {
        currentTable = table
        currentAssignations[table.id] = currentAssignations[table.id].filter((id) => id !== attendee.id)
      }
    })

    const enabledTables = tables.filter(t => t.enabled).filter(t => currentAssignations[t.id].length < t.seats).filter(t => t !== currentTable)

    // tables without korean attendees
    const tablesWithoutKorean = enabledTables.filter(t => !currentAssignations[t.id].some((id) => attendees.find(a => a.id === id)?.isKorean))

    let randomTable: Table | undefined
    if (tablesWithoutKorean.length > 0 && attendee.isKorean) {
      randomTable = sample(tablesWithoutKorean)
    } else {
      randomTable = sample(enabledTables)
    }
    if (randomTable != null) {
      currentAssignations[randomTable.id] = currentAssignations[randomTable.id] ?? []
      currentAssignations[randomTable.id].push(attendee.id)
      props.openNotification(`${attendee.name} was added to table ${randomTable.id}/${randomTable.name}`)
    }
    setAssignations(currentAssignations)
  }
  return (
    <Card
      actions={[
        <PlusOutlined onClick={() => { addToRandomTable(item) }} />,
        <MinusOutlined onClick={() => { removeFromTable(item) }} />,
        <Button type='text' onClick={() => { toggleLanguage(item) }}>{item.isKorean ? '🇰🇷' : '🇨🇦'}</Button>,
        <Popconfirm

          title={`Delete ${item.name}`}
          description={`Are you sure to delete ${item.name}?`}
          onConfirm={() => { deleteAttendee(item) }}
          okText="Yes"
          cancelText="No"
        >
          <DeleteOutlined color='red' />
        </Popconfirm>
      ]}
    >
      <Meta
        avatar={<Avatar src={!isEmpty(item.image) ? item.image : `https://ui-avatars.com/api/?name=${item.name}`} size={'large'} />}
        title={item.name}
        description={<div>
          Next Table: <b>{nextTable?.id ?? 'None'}</b> <br /> <small>Current Table: {currentTable?.id ?? 'None'}</small>
        </div>} />

    </Card>
  )
}
