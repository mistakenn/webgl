var app = new APP()
var controls
var geometry, material, mesh
var blocker = document.getElementById( 'blocker' )
var instructions = document.getElementById( 'instructions' )
var pommel, pspommel
var camStart = new THREE.Vector3( 0, 10, 30 )
var camStLookAt = new THREE.Vector3( 0, 0, 0 )

app.load('models/wolf.obj', 0.05)

var initialBCP = new THREE.Vector3( 200*Math.random()*(Math.random() > 0.5 ? 1 : -1), 20, 200*Math.random()*(Math.random() > 0.5 ? 1 : -1) )
var finalBCP = new THREE.Vector3( 200*Math.random()*(Math.random() > 0.5 ? 1 : -1), 20, 200*Math.random()*(Math.random() > 0.5 ? 1 : -1) )

app.load('models/pommel.obj', 1, obj => {
  obj.position.setX(10).setY(10)
  pspommel = obj
})

// Pseudo-pommel
app.sphere( obj => {
  obj.position.setX(initialBCP.x).setY(initialBCP.y).setZ(initialBCP.z)
  pommel = obj
})

var witch
app.texture('models/witch-fire.png', text => {
  app.load('models/witch.obj', 1, obj => {
    obj.position.setX(-10)
    witch = obj
    obj.traverse( function ( child ) {
      if ( child instanceof THREE.Mesh )
        child.material.map = text
    })
  })
})

app.load('models/deer.obj', 0.01, obj => {
  obj.position.setX(10)
  shader(obj)
}, shader)

function shader (obj) {
  var material = new THREE.ShaderMaterial({
    vertexShader: document.getElementById( 'vertex-shader' ).textContent,
    fragmentShader: document.getElementById( 'fragment-shader' ).textContent
  })
  obj.traverse(function (child) {
    child.material = material
  })
}

var pointerlock = new Pointerlock()
pointerlock.check(() => {}, err)
function err () {
  instructions.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API'
}

pointerlock.onChange(function ( event ) {
  var lock = pointerlock.hasLock()
  controlsEnabled = lock
  controls.enabled = lock
  blocker.style.display = lock ? 'none' : 'block'
  instructions.style.display = lock ? '' : '-webkit-box'
})
instructions.addEventListener( 'click', function ( event ) {
  instructions.style.display = 'none'
  pointerlock.request()
}, false )
pointerlock.onError(() => {})

controls = new THREE.PointerLockControls(app.camera)
controls.getObject().translateZ(30)
app.scene.add(controls.getObject())
app.scenario()
KeyboardMove.aswd()

var controlsEnabled = false

app.draw(() => {
  if (!controlsEnabled) {
    prevTime = performance.now()
    return
  }

  movePseudoPommel()
  movePommel()
  moveCamera()
})

var signal = [ 1, -1 ]
var inc = [ 0.4, 0.1, 0.4 ]
var radio = 10

function movePseudoPommel() {
  if (Math.abs(pspommel.position.x) <= Math.abs(pspommel.position.z)) {
    pspommel.position.x += inc[0] * signal[1]
    pspommel.position.z = Math.sqrt(radio * radio - Math.pow(pspommel.position.x, 2)) * signal[1]
  }
  else {
    pspommel.position.z -= inc[2] * signal[0]
    pspommel.position.x = Math.sqrt(radio * radio - Math.pow(pspommel.position.z, 2)) * signal[0]
  }

  pspommel.position.y -= inc[1] * signal[1]

  if (Math.abs(pspommel.position.x) <= inc[0] * 0.5)
    signal[0] *= -1
  if (Math.abs(pspommel.position.z) <= inc[2] * 0.5)
    signal[1] *= -1
}

var curves = [new THREE.CubicBezierCurve3(
                initialBCP,
                new THREE.Vector3( -85, 20, -60 ),
                new THREE.Vector3( 117, 20, 4 ),
                finalBCP
              ),
              new THREE.CubicBezierCurve3(
                finalBCP,
                new THREE.Vector3( -129, 20, 3 ),
                new THREE.Vector3( 90, 20, 71 ),
                initialBCP
              )]

var atCurve = 0
var curveTime = 0
var curveInc = 0.01

function movePommel() {
  pommel.position.copy( curves[atCurve].getPointAt(curveTime += curveInc) )
  if ( Math.abs(curveTime-0.99) < 0.01 )
    curveTime = 0, atCurve ^= 1

}

var prevTime = performance.now()
var velocity = new THREE.Vector3()

var startSpeed = 800.00
var maxCoord = [ 50.00, 450.00, 50.00 ]

function moveCamera() {  
  var camera = controls.getObject()

  witch.rotateY( 0.01 )

  if ( KeyboardMove.keys.Hm ) {
    camera.position.copy( camStart )
    velocity.x = velocity.y = velocity.z = 0
  }

  var time = performance.now()
  var delta = ( time - prevTime ) / 1000
  var sft = KeyboardMove.keys.Sft
  velocity.x -= velocity.x * 10.0 * delta
  velocity.z -= velocity.z * 10.0 * delta

  //velocity.y -= 9.8 * 10.0 * delta
  if ( KeyboardMove.keys.W ) velocity.z -= startSpeed * delta * Math.max(1, sft * 3)
  if ( KeyboardMove.keys.S ) velocity.z += startSpeed * delta
  if ( KeyboardMove.keys.A ) velocity.x -= startSpeed * delta
  if ( KeyboardMove.keys.D ) velocity.x += startSpeed * delta
  
  if ( KeyboardMove.keys.C )
    velocity.y -= startSpeed * 0.5 * delta
  else if (velocity.y < 0.0) // take it off to turn gravity on
    velocity.y *= 0.92

  if ( KeyboardMove.keys.Spc )
    velocity.y += startSpeed * 0.4 * delta * Math.max(1, (velocity.y < 0.0) * 3)
  else if (velocity.y > 0.0)
    velocity.y *= 0.95

  if (camera.position.y >= maxCoord[1] && velocity.y > 0.0)
    velocity.y = 0.0
  else if (camera.position.y <= 30.00 && velocity.y < 0.0 || camera.position.y + 30.00 >= maxCoord[1] && velocity.y > 0.0)
    velocity.y *= 0.9

  camera.translateX( velocity.x * delta );
  camera.translateY( velocity.y * delta );
  camera.translateZ( velocity.z * delta );

  if ( camera.position.y < 10 ) {
    velocity.y = 0;
    camera.position.y = 10;
  }

  prevTime = time
}

window.addEventListener( 'resize', onWindowResize, false )

function onWindowResize(){
  app.camera.aspect = window.innerWidth / window.innerHeight
  app.camera.updateProjectionMatrix()

  app.renderer.setSize( window.innerWidth, window.innerHeight )
}

app.render()