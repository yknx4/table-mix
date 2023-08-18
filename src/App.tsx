import './App.css'
import { Avatar, Button, Card, Col, Divider, List, Row, Space, notification } from 'antd'
import useLocalStorage from '@rehooks/local-storage'
import Meta from 'antd/es/card/Meta'
import { PlusOutlined, MinusOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons'
import TextArea from 'antd/es/input/TextArea'
import { useState } from 'react'
import { sample } from 'lodash'

interface Table {
  id: number
  name: string
  seats: number
  enabled: boolean
}

interface Attendee {
  id: string
  name: string
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

interface AttendeeCardProps {
  attendee: Attendee
  openNotification: (message: string) => void
}
function AttendeeCard (props: AttendeeCardProps): JSX.Element {
  const [tables] = useLocalStorage('tables', data)
  const [assignations, setAssignations] = useLocalStorage<TableAssignations>('assignations', {})
  const item = props.attendee
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
  const addToRandomTable = (attendee: Attendee): void => {
    const currentAssignations = { ...assignations }

    tables.forEach((table) => {
      currentAssignations[table.id] = currentAssignations[table.id] ?? []
      if (currentAssignations[table.id].includes(attendee.id)) {
        currentAssignations[table.id] = currentAssignations[table.id].filter((id) => id !== attendee.id)
      }
    })

    const enabledTables = tables.filter(t => t.enabled).filter(t => currentAssignations[t.id].length < t.seats)
    const randomTable = sample(enabledTables)
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
        <MinusOutlined onClick={() => { removeFromTable(item) }} />
      ]}
    >
      <Meta
        avatar={<Avatar src={`https://i.pravatar.cc/150?u=${item.name}`} />}
        title={item.name}
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
  const [toAdd, setToAdd] = useState<string>()
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setToAdd(e.target.value)
  }

  const unasignedAttendees = attendees.filter((attendee) => { return !Object.values(assignations).flat().includes(attendee.id) })

  const generateAttendees = (): void => {
    const newAttendees = toAdd?.split('\n').filter(n => n !== '').map<Attendee>((name) => {
      const id = Math.random().toString(36).slice(2, 7)
      return { id, name }
    }) ?? []
    setAttendees([...attendees, ...newAttendees])
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
              header={<div>Tables <Button onClick={() => { setAssignations({}) }}>Clear</Button></div>}
              footer={<div>Total Tables: {data.filter(d => d.enabled).length} | Total People: {attendees.length}</div>}
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
                        description={item.enabled ? `Seats: ${item.seats} Left: ${item.seats - thisTableAttendees.length}` : 'Table is disabled'}
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
              <Button type="dashed" onClick={() => { setAttendees([]); setAssignations({}) }}>Clear All</Button>
            </Space.Compact>
            <Divider orientation="left">Attendees</Divider>
            <List
              header={<div>Name</div>}
              footer={<div>Assigned: {attendees.length - unasignedAttendees.length} | Pending: {unasignedAttendees.length}</div>}
              bordered
              dataSource={unasignedAttendees}
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
