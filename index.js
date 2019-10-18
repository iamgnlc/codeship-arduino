const Codeship = require("codeship-api")
const { Board, Led } = require("johnny-five")
const board = new Board()

const config = require("./config")
const logo = require("./logo")

const colors = {
  reset: "\x1b[0m",
  success: "\x1b[32m",
  testing: "\x1b[33m",
  error: "\x1b[31m",
}

var status, prevStatus

function output(text, color = colors.reset) {
  console.log(color, text, colors.reset)
}

// Get last build status from Codeship.
async function getStatus() {
  const codeship = new Codeship({
    username: config.userName,
    password: config.password,
  })
  await codeship.authenticate()
  await codeship.refresh()

  let lastBuild = codeship.organizations[config.organization].projects.filter(
    (project) => {
      return project.uuid === config.projectUuid
    },
  )

  // If project found, set build status.
  if (lastBuild.length) {
    status = lastBuild[0].builds[0].status
    // Output only if status is changed.
    if (prevStatus !== status) output(`Build ${status}`, colors[status])
  } else {
    output("Project not found", colors.error)
    process.exit()
  }

  // Save previous state.
  prevStatus = status

  return await status
}

// Update board leds.
function updateBoard(status = false) {
  var leds = {
    success: new Led(11),
    testing: new Led(12),
    error: new Led(13),
  }

  // Set leds.
  Object.keys(leds).forEach((key) => {
    if (key == status) leds[key].on()
    else leds[key].off()
  })
}

// Init process.
async function run() {
  let status = await getStatus()
  updateBoard(status)
}

// Main loop.
board.on("ready", () => {
  console.clear()
  output(logo)
  output("Start...")
  run()
  setInterval(() => {
    run()
  }, config.timeInterval)
})

// Exit.
board.on("exit", function() {
  updateBoard()
  output("Exit board")
})
