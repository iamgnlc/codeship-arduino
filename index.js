const Codeship = require("codeship-api")
const { Board, Led, Button } = require("johnny-five")
const board = new Board()

const config = require("./config")
const logo = require("./logo")

const colors = {
  reset: "\x1b[0m",
  success: "\x1b[32m",
  testing: "\x1b[33m",
  error: "\x1b[31m",
  build: "\x1b[36m",
}
const codeship = new Codeship({
  username: config.userName,
  password: config.password,
})

var status, prevStatus

function output(text, color = colors.reset) {
  console.log(color, text, colors.reset)
}

async function getProject() {
  await codeship.authenticate()
  await codeship.refresh()

  let project = codeship.organizations[config.organization].projects.filter(
    (project) => {
      return project.name === config.project
    },
  )

  return project.length ? project[0] : null
}

// Get last build status from Codeship.
async function getStatus() {
  let project = await getProject()

  // If project found, set build status.
  if (project) {
    status = project.builds[0].status
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

// Retrigger last build.
async function triggerBuild() {
  let project = await getProject()

  const build = {
    organization: codeship.organizations[config.organization].uuid,
    project: project.uuid,
    build: project.builds[0].uuid,
  }

  output("Build triggered", colors.build)

  await codeship.buildRestart(build)
}

// Update board leds.
function ledsOutput(status = false) {
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
  ledsOutput(status)
}

// Main loop.
board.on("ready", () => {
  var buildButton = new Button(2)

  buildButton.on("down", () => {
    triggerBuild()
  })

  console.clear()
  output(logo)
  output(config.project)
  run()
  setInterval(() => {
    run()
  }, config.timeInterval)
})

// Exit.
board.on("exit", () => {
  ledsOutput()
  output("Exit board")
})
