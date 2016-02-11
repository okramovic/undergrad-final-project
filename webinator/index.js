var ReactFauxDOM = require('react-faux-dom')
var React = require('react')
var ReactDOM = require('react-dom')
var ReactTabs = require('react-tabs')
var Tab = ReactTabs.Tab
var Tabs = ReactTabs.Tabs
var TabList = ReactTabs.TabList
var TabPanel = ReactTabs.TabPanel
var d3 = require('d3')
var io = require('socket.io-client')

var App = React.createClass({
  propTypes: {
    data: React.PropTypes.array
  },

  getInitialState: function () {
    return {
      acceleration: {x: 0, y: 0, z: 0},
      rawData: [],
      touchEvent: false,
      data: [this.props.data, this.props.data, this.props.data]
    }
  },

  componentWillMount: function () {
    if (window && window.DeviceMotionEvent) {
      this.motionListener = this.handleMotionChange
      window.addEventListener('devicemotion', this.motionListener, false)
    }
  },

  componentDidMount: function () {
    this.socket = io('http://192.168.0.5:3000')
    // this.socket = io('http://10.100.131.82:3000')
    // this.socket = io('http://172.16.42.86:3000/')
  },

  componentWillUnmount: function () {
    if (window) {
      window.removeEventListener('devicemotion', this.motionListener, false)
    }
  },

  handleMotionChange: function (event) {
    if (!this.state.touchEvent && !this.continuousSend) return

    var acceleration = {
      x: event.acceleration.x,
      y: event.acceleration.y,
      z: event.acceleration.z
    }

    this.setState({
      acceleration: acceleration
    })

    if (this.state.touchEvent) {
      var rawData = this.state.rawData
      rawData.push(acceleration)

      if (this.state.touchEvent) {
        this.setState({
          rawData: rawData
        })
      }
    } else {
      var inputsArray = []
      inputsArray.push(acceleration.x, acceleration.y, acceleration.z)
      this.socket.emit('browser', inputsArray)
    }
  },

  handleGestureStart: function () {
    this.setState({
      touchEvent: true
    })
  },

  handleContinuousStart: function () {
    this.continuousSend = true
  },

  handleTouchEnd: function () {
    this.setState({
      touchEvent: false
    })

    this.continuousSend = false

    var inputsNumber = 60
    var inputsArray = []
    var rawData = this.state.rawData

    // TODO: how do I deal with short gestures?
    // Ignore for now, later maybe interpolation
    if ((rawData.length * 3) < inputsNumber) {
      this.setState({
        rawData: []
      })
      return
    }

    // Downsample by sampling every N sample using the downsampleFactor variable
    var downsampleFactor = (rawData.length * 3) / inputsNumber
    var sampleIndex = 0
    var xArray = []
    var yArray = []
    var zArray = []

    for (var i = 0; i < inputsNumber / 3; i++) {
      var x = rawData[Math.round(sampleIndex)].x
      var y = rawData[Math.round(sampleIndex)].y
      var z = rawData[Math.round(sampleIndex)].z
      inputsArray.push(x, y, z)
      xArray.push(x)
      yArray.push(y)
      zArray.push(z)
      sampleIndex += downsampleFactor
    }

    this.setState({
      data: [xArray, yArray, zArray],
      rawData: []
    })

    if (this.state.touchEvent) { this.socket.emit('browser', inputsArray) }
  },

  render: function () {
    var m = [10, 10, 25, 45] // margins
    var w = 300 - m[1] - m[3] // width
    var h = 200 - m[0] - m[2] // height
    var data = this.state.data

    var x = d3.scale.linear().domain([0, data[0].length]).range([0, w])
    var y = d3.scale.linear().domain([-7, 7]).range([h, 0])

    var xAxis = d3.svg.axis()
      .scale(x)
      .orient('bottom')
      .ticks(5)

    var yAxisLeft = d3.svg.axis()
      .scale(y)
      .ticks(4)
      .orient('left')

    var line = d3.svg.line()
      .x(function (d, i) { return x(i) })
      .y(function (d) { return y(d) })

    var nodeX = ReactFauxDOM.createElement('svg')
    var nodeY = ReactFauxDOM.createElement('svg')
    var nodeZ = ReactFauxDOM.createElement('svg')
    var nodes = []
    nodes.push(nodeX, nodeY, nodeZ)

    for (var i = 0; i < 3; i++) {
      var svg = d3.select(nodes[i])
        .attr('width', w + m[1] + m[3])
        .attr('height', h + m[0] + m[2])
        .append('g')
        .attr('transform', 'translate(' + m[3] + ',' + m[0] + ')')

      svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + h + ')')
        .call(xAxis)

      svg.append('g')
        .attr('class', 'y axis')
        .attr('transform', 'translate(-25,0)')
        .call(yAxisLeft)

      svg.append('path').attr('d', line(data[i]))
    }

    return (
      <Tabs>
        <TabList>
          <Tab>Graphs</Tab>
          <Tab>Record</Tab>
        </TabList>

        <TabPanel>
          <div> { nodes[0].toReact() } </div>
          <div> { nodes[1].toReact() } </div>
          <div> { nodes[2].toReact() } </div>
        </TabPanel>
        <TabPanel>
          <div className='button'
                onTouchStart={this.handleGestureStart}
                onTouchEnd={this.handleTouchEnd}>
            Record gesture
          </div>
          <div className='button'
                onTouchStart={this.handleContinuousStart}
                onTouchEnd={this.handleTouchEnd}>
            Send continuous data
          </div>
          {this.state.touchEvent ? <div> {this.state.acceleration.x} </div> : null}
          {this.state.touchEvent ? <div> {this.state.acceleration.y} </div> : null}
          {this.state.touchEvent ? <div> {this.state.acceleration.z} </div> : null}
        </TabPanel>

      </Tabs>
    )
  }
})

var data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
ReactDOM.render(<App data = {data} />, document.querySelector('#content'))

