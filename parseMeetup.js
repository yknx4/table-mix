var data = document.querySelectorAll('[data-event-label="attendee-card"]')
var res = []
data.forEach(function (item) {
  // find children by class name
  var name = item.getElementsByClassName('font-medium')[0].innerText
  // find image if exists by tag name and get src attribute
  var image = item.getElementsByTagName('img')[0] ? item.getElementsByTagName('img')[0].getAttribute('src') : ''
  res.push({name, image})
})

JSON.stringify(res)
