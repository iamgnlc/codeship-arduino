const Codeship = require("codeship-api")
const { Board, Led } = require("johnny-five")
const board = new Board()

const config = require("./config")

// Get last build status from Codeship.
async function getStatus() {
  let status
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
    console.info("Build", status)
  } else {
    console.error("Project not found.")
  }

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

function resetBoard() {}

// Main loop.
board.on("ready", () => {
  run()
  setInterval(() => {
    run()
  }, config.timeInterval)
})

// Exit.
board.on("exit", function() {
  updateBoard()
  console.log("Exit board")
})
