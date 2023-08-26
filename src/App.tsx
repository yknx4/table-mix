import './App.css'
import { Avatar, Button, Card, Col, Divider, List, Popconfirm, Row, Space, notification } from 'antd'
import useLocalStorage from '@rehooks/local-storage'
import Meta from 'antd/es/card/Meta'
import { PlusOutlined, MinusOutlined, CloseOutlined, CheckOutlined, DeleteOutlined } from '@ant-design/icons'
import TextArea from 'antd/es/input/TextArea'
import { useMemo, useState } from 'react'
import { isEmpty, sample, shuffle, sortBy, sumBy, take } from 'lodash'

interface Table {
  id: number
  name: string
  seats: number
  enabled: boolean
}

interface Attendee {
  id: string
  name: string
  image?: string
  isKorean: boolean
}

const data: Table[] = [
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

type TableAssignations = Record<Table['id'], Array<Attendee['id']>>

function assignationsReverseIndex (assignations: TableAssignations, tables: Table[]): Record<Attendee['id'], Table> {
  const result: Record<Attendee['id'], Table> = {}
  Object.entries(assignations).forEach(([tableId, attendees]) => {
    attendees.forEach((attendeeId) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result[attendeeId] = tables.find((table) => table.id === Number(tableId))!
    })
  })
  return result
}

interface AttendeeCardProps {
  attendee: Attendee
  openNotification: (message: string) => void
}
function AttendeeCard (props: AttendeeCardProps): JSX.Element {
  const [tables] = useLocalStorage('tables', data)
  const [attendees, setAttendees] = useLocalStorage<Attendee[]>('attendees', [])
  const [assignations, setAssignations] = useLocalStorage<TableAssignations>('assignations', {})
  const [oldAssignations] = useLocalStorage<TableAssignations>('previous-assignations', {})
  const currentTable = useMemo(() => assignationsReverseIndex(assignations, tables)[props.attendee.id], [assignations, tables, props.attendee.id])
  const previousTable = useMemo(() => assignationsReverseIndex(oldAssignations, tables)[props.attendee.id], [oldAssignations, tables, props.attendee.id])
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
          Current Table: <b>{currentTable?.id ?? 'None'}</b> <br /> <small>Previous Table: {previousTable?.id ?? 'None'}</small>
        </div>}
      />

    </Card>
  )
}

function App (): JSX.Element {
  const [api, contextHolder] = notification.useNotification()

  const openNotification = (message: string): void => {
    api.info({
      message,
      placement: 'top'
    })
  }
  const [tables, setTables] = useLocalStorage('tables', data)
  const [attendees, setAttendees] = useLocalStorage<Attendee[]>('attendees', [])
  const [assignations, setAssignations] = useLocalStorage<TableAssignations>('assignations', {})
  const [, setOldAssignations] = useLocalStorage<TableAssignations>('previous-assignations', {})
  const [toAdd, setToAdd] = useState<string>()
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setToAdd(e.target.value)
  }

  const unasignedAttendees = attendees.filter((attendee) => { return !Object.values(assignations).flat().includes(attendee.id) })

  const generateNewRound = (): void => {
    let activeAttendees = attendees.filter((attendee) => { return Object.values(assignations).flat().includes(attendee.id) })
    if (activeAttendees.length === 0) {
      activeAttendees = attendees
    }
    setOldAssignations(assignations)
    const newAssignations: TableAssignations = {}
    tables.forEach((table) => { newAssignations[table.id] = [] })
    const koreanAttendees = shuffle(activeAttendees.filter(a => a.isKorean))
    const nonKoreanAttendees = shuffle(activeAttendees.filter(a => !a.isKorean))
    const firstKoreanAttendees = take(koreanAttendees, tables.filter(t => t.enabled).length)
    const restKoreanAttendees = koreanAttendees.filter(a => !firstKoreanAttendees.includes(a))
    const firstNonKoreanAttendees = take(nonKoreanAttendees, tables.filter(t => t.enabled).length)
    const restNonKoreanAttendees = nonKoreanAttendees.filter(a => !firstNonKoreanAttendees.includes(a))
    const allElse = shuffle([...restKoreanAttendees, ...restNonKoreanAttendees])
    const sortedAttendees = [...firstKoreanAttendees, ...firstNonKoreanAttendees, ...allElse]
    sortedAttendees.forEach((attendee) => {
      const availableTables = tables.filter(t => t.enabled).filter(t => newAssignations[t.id].length < t.seats)
      const tablesWithoutKorean = availableTables.filter(t => !newAssignations[t.id].some((id) => attendees.find(a => a.id === id)?.isKorean))
      const tablesWithOnlyKoreans = availableTables.filter(t => newAssignations[t.id].every((id) => attendees.find(a => a.id === id)?.isKorean))

      let appropiateTables: Table[] = []
      if (tablesWithoutKorean.length > 0 && attendee.isKorean) {
        appropiateTables = tablesWithoutKorean
      } else if (tablesWithOnlyKoreans.length > 0 && !attendee.isKorean) {
        appropiateTables = tablesWithOnlyKoreans
      } else {
        appropiateTables = availableTables
      }

      const randomTable = sample(appropiateTables)
      if (randomTable != null) {
        newAssignations[randomTable.id].push(attendee.id)
      }
    })
    setAssignations(newAssignations)
  }

  interface SnippetResource {
    name: string
    image?: string
  }

  const generateAttendees = (): void => {
    try {
      const newAttendees = JSON.parse(toAdd ?? '') as SnippetResource[]
      const attendeesToAdd = newAttendees.filter(a => !attendees.some(ea => ea.name === a.name)).map<Attendee>((attendee) => {
        const id = Math.random().toString(36).slice(2, 7)
        return { id, name: attendee.name, image: attendee.image, isKorean: false }
      })
      setAttendees([...attendees, ...attendeesToAdd])
    } catch (error) {
      const newAttendees = toAdd?.split('\n').filter(n => n !== '').map<Attendee>((name) => {
        const id = Math.random().toString(36).slice(2, 7)
        return { id, name, isKorean: false }
      }) ?? []
      setAttendees([...attendees, ...newAttendees])
    }
  }
  const toggleTable = (id: number): void => {
    const newTables = tables.map((table) => {
      if (table.id === id) {
        return { ...table, enabled: !table.enabled }
      }
      return table
    })
    setTables(newTables)
  }

  const editNumberOfSeats = (id: number, diff: number): void => {
    const newTables = tables.map((table) => {
      const seats = table.seats + diff
      console.log(`table ${table.id} has ${table.seats} seats, newSeats: ${seats}`)
      if (table.id === id && seats > 0) {
        return { ...table, seats }
      }
      return table
    })
    setTables(newTables)
  }

  return (
    <div className="App">
      {contextHolder}
      <Row>
        <Col flex='auto'>
          <Space direction='vertical'>
            <Divider orientation="left">Asignation</Divider>
            <List
              header={<div>Tables <Button disabled={isEmpty(assignations)} onClick={() => { setOldAssignations(assignations); setAssignations({}) }}>Clear</Button><Button onClick={() => { generateNewRound() }}>Shuffle</Button></div>}
              footer={<div>Total Tables: {tables.filter(d => d.enabled).length} | Total Seats: {sumBy(tables.filter(d => d.enabled), 'seats')} | Total People: {attendees.length}</div>}
              bordered
              dataSource={tables}
              renderItem={(item) => {
                const attendeesIds = assignations[item.id] ?? []
                const thisTableAttendees = attendeesIds.map((id) => attendees.find((attendee) => attendee.id === id)).filter((a) => a != null)

                return (
                  <List.Item>
                    <Card
                      actions={[
                        <PlusOutlined onClick={() => { editNumberOfSeats(item.id, 1) }} />,
                        <MinusOutlined onClick={() => { editNumberOfSeats(item.id, -1) }} />,
                        item.enabled ? <CloseOutlined onClick={() => { toggleTable(item.id) }} /> : <CheckOutlined onClick={() => { toggleTable(item.id) }} />
                      ]}
                    >
                      <Meta
                        avatar={<Avatar src={`https://i.pravatar.cc/150?img=${item.id}`} />}
                        title={`${item.id} - ${item.name}`}
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        description={item.enabled ? `Seats: ${item.seats} Left: ${item.seats - thisTableAttendees.length} 🇰🇷: ${thisTableAttendees.filter(a => a?.isKorean).length} 🇨🇦: ${thisTableAttendees.filter(a => !(a!.isKorean)).length}` : 'Table is disabled'}
                      />
                    </Card>
                    <Space wrap>
                      {assignations[item.id]?.map((attendeeId) => {
                        const attendee = attendees.find((attendee) => attendee.id === attendeeId)
                        return (attendee != null && <AttendeeCard attendee={attendee} openNotification={openNotification} />)
                      })}
                    </Space>
                  </List.Item>)
              }
              }
            />
          </Space>
        </Col>
        <Col flex={1}>
          <Divider orientation="left">Add People</Divider>
          <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
            <TextArea rows={4} placeholder="Separate each name by new line" allowClear onChange={onChange} />
            <Space.Compact block>
              <Button type="primary" onClick={() => { generateAttendees() }}>Add</Button>

            </Space.Compact>
            <Divider orientation="left">Attendees</Divider>
            <List
              grid={{ gutter: 16, column: 4 }}
              header={<div>Name</div>}
              footer={
                <div>
                  Assigned: {attendees.length - unasignedAttendees.length} | Pending: {unasignedAttendees.length} |
                  <Popconfirm
                    title="Delete All"
                    description="Are you sure to delete all people?"
                    onConfirm={() => { setAttendees([]); setAssignations({}) }}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button type="dashed" danger>Delete All</Button>
                  </Popconfirm>
                </div>}
              bordered
              dataSource={sortBy(attendees, ['name'])}
              renderItem={(item) => (
                <List.Item>
                  <AttendeeCard attendee={item} openNotification={openNotification} />
                </List.Item>
              )}
            />
          </Space>
        </Col>
      </Row>

    </div>
  )
}

export default App
