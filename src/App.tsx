import './App.css'
import { Avatar, Button, Card, Col, Divider, List, Popconfirm, Row, Space, notification } from 'antd'
import useLocalStorage from '@rehooks/local-storage'
import Meta from 'antd/es/card/Meta'
import { PlusOutlined, MinusOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons'
import TextArea from 'antd/es/input/TextArea'
import { useState } from 'react'
import { isEmpty, sample, shuffle, sortBy, sumBy, take } from 'lodash'
import { AttendeeCard } from './AttendeeCard'
import { type Attendee, type Table, type TableAssignations } from './types'
import { defaultTables } from './helpers'

function App (): JSX.Element {
  const [api, contextHolder] = notification.useNotification()

  const openNotification = (message: string): void => {
    api.info({
      message,
      placement: 'top'
    })
  }
  const [tables, setTables] = useLocalStorage('tables', defaultTables)
  const [attendees, setAttendees] = useLocalStorage<Attendee[]>('attendees', [])
  const [assignations, setAssignations] = useLocalStorage<TableAssignations>('assignations', {})
  const [newAssignations, setNewAssignations] = useLocalStorage<TableAssignations>('next-assignations', {})
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
    setNewAssignations(newAssignations)
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
              header={<div>Tables <Button disabled={isEmpty(assignations)} onClick={() => { setNewAssignations(assignations); setAssignations({}) }}>Clear</Button><Button onClick={() => { generateNewRound() }}>Shuffle</Button><Button onClick={() => { setAssignations(newAssignations); generateNewRound() }}>Start New Round</Button></div>}
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
