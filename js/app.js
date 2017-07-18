function APP(WALLWIDTH, WALLHEIGHT) {
  // Scene
  this.scene = new THREE.Scene()
  this.clock = new THREE.Clock()
  this.floor = 0

  // Wall
  this.wallWidth = WALLWIDTH || 5000
  this.wallHeight = WALLHEIGHT || 400

  // Camera
  let viewAngle = 75,
    aspectRatio = window.innerWidth / window.innerHeight,
    near = 0.4,
    far = 20000
  this.camera = new THREE.PerspectiveCamera(viewAngle, aspectRatio, near, far)
  this.camera.updateProjectionMatrix()
  this.camera.position.z = 0

  //Loader manager
  this.manager = new THREE.LoadingManager()
  this.manager.onLoad = onLoad
  this.manager.onProgress = onProgress

  //Private methods
  this.get = function (name) {
    if (objects[ name ])
      return objects[ name ]
    return null
  }
  this.set = function (name, obj) {
    objects[ name ] = obj
  }

  // Light
  this.light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 1)
  // this.light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 )
  // this.light = new THREE.DirectionalLight( 0xff0000 )
  this.light.position.set(0.5, 1, 0.75)
  // this.light.position.set( 1, 0, 1 ).normalize()
  this.scene.add(this.light)
  
  //Directional Light
  this.directional = new THREE.DirectionalLight(0xeeeeff)
  this.directional.position.set(0.5, 1, 0.75)
  this.directional.ambient = new THREE.Vector3(1.0, 1.0, 1.0)
  this.directional.diffuse = new THREE.Vector3(1.0, 1.0, 1.0)
  this.directional.specular = new THREE.Vector3(1.0, 1.0, 1.0)

  // this.light.position.set( 1, 0, 1 ).normalize()
  this.scene.add(this.directional)

  // Scene background
  // http://www.custommapmakers.org/skyboxes.php
  let imagePrefix = "images/background/hills2_"
  let directions = ["rt", "lf", "up", "dn", "bk", "ft"]
  let imageSuffix = ".png"

  let urls = []
  for (let i = 0; i < 6; i++)
    urls.push(imagePrefix + directions[i] + imageSuffix)

  let reflectionCube = new THREE.CubeTextureLoader().load(urls)
  reflectionCube.format = THREE.RGBFormat
  this.scene.background = reflectionCube

  // Axes lines
  // let axes = new THREE.AxisHelper(100)
  // this.scene.add( axes )

  // Objects
  let objects = {}
  this.fn = () => {}
  this.arr = []
}

function onLoad() {}

function onProgress(url, item, total) {}

APP.prototype.draw = function (fn) {
  this.fn = fn
}

APP.prototype.delta = function () {
  return this.clock.getDelta() }

APP.prototype.texture = function (url, fn) {
  let texture = new THREE.Texture()
  let loader = new THREE.ImageLoader(this.manager)
  loader.load(url, function (image) {
    texture.image = image
    texture.needsUpdate = true
    if (fn)
      fn(texture)
  })
  return texture
}

APP.prototype.png = function (url) {
  let loader = new THREE.ImageLoader(this.manager)
  return this.global('png', loader, url).return(image => {
    let texture = new THREE.Texture()
    texture.image = image
    texture.needsUpdate = true
    return texture
  })
}

APP.prototype.obj = function (url) {
  let loader = new THREE.OBJLoader(this.manager)
  return this.global('obj', loader, url)
}

APP.prototype.json = function (url) {
  let loader = new THREE.JSONLoader()
  return this.global('json', loader, url)

  // loader.load('models/arms/broom.json', function (geometry, materials) {
  //   let b = new THREE.SkinnedMesh(
  //     geometry,
  //     new THREE.MeshLambertMaterial({ color: 0x6A3E25, skinning: true })
  //   );

  //   app.camera.add(b)
  //   //broom.translateY(30).scale.set(10,10,10)
  //   b.translateX(0).translateZ(0).translateY(-6).scale.set(2,2,2)
  //   //broom.translateX(0).translateZ(-10).translateY(-6).scale.set(2,2,2)

  //   isLoaded = true;
  // });
}

APP.prototype.global = function (ext, loader, url) {
  let self = this
  let prop = { before: [], after: [] }
  function construct (name) {
    return function (fn) {
      if (Array.isArray(prop[ name ]))
        prop[ name ].push(fn)
      else
        prop[ name ] = fn
      return this
    }
  }
  function load (callback) {
    let name = url.split('/').slice(-1).pop()
    loader.load(`${url}.${ext}`, (obj, mat) => {
      if (prop.return) {
        let ret = prop.return(obj)
        prop.before.forEach(fn => fn(ret, mat))
        prop.after.forEach(fn => fn(ret, mat))
        return true
      }
      if (prop.scale)
        obj.scale.set(prop.scale, prop.scale, prop.scale)
      obj.position.set(0, self.floor, 0)
      prop.before.forEach(fn => fn(obj, mat))
      if (prop.texture)
        obj.traverse(function (child) {
          if (child instanceof THREE.Mesh)
            child.material.map = prop.texture
        })
      self.scene.add(obj)
      self.set(prop.as ? prop.as : name, obj)
      prop.after.forEach(fn => fn(obj, mat))
    })
  }
  return {
    load,
    before: construct('before'),
    texture: construct('texture'),
    after: construct('after'),
    scale: construct('scale'),
    return: construct('return'),
    as: construct('as')
  }
}

APP.prototype.load = function (url, scale, callback, endcallback) {
  let loader = new THREE.OBJLoader(this.manager)
  let self = this
  loader.load(url, obj => {
    obj.scale.set(scale, scale, scale)
    obj.position.set(0, this.floor, 0)
    if (callback != undefined)
      callback(obj)
    self.scene.add(obj)
    if (endcallback != undefined)
      endcallback(obj)
  })
}

APP.prototype.render = function () {
  let self = this
  this.renderer = new THREE.WebGLRenderer()
  this.renderer.setClearColor(0x9ef6ff)
  this.renderer.setPixelRatio(window.devicePixelRatio)
  this.renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(this.renderer.domElement)

  const render = () => {
    requestAnimationFrame(render)
    this.fn()
    self.renderer.render(self.scene, self.camera)
  }
  render()
}

// Draw scenario
APP.prototype.scenario = function () {
  this.bottom()
  this.wall(0, -this.wallWidth / 2, 0)
  this.wall(0, this.wallWidth / 2, Math.PI)
  this.wall(-this.wallWidth / 2, 0, Math.PI / 2)
  this.wall(this.wallWidth / 2, 0, -Math.PI / 2)
}

//Draw floor
APP.prototype.bottom = function () {
  let geometry = new THREE.PlaneGeometry(20000, 20000, 100, 100)
  geometry.rotateX(-Math.PI / 2)

  let textureLoader = new THREE.TextureLoader()
  let texture = textureLoader.load('images/misc/grass.png')
  let material = new THREE.MeshPhongMaterial({
    color: 0xaaaaaa,
    specular: 0x000000,
    map: texture
  })

  texture.anisotropy = 6
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(800, 800)

  let mesh = new THREE.Mesh(geometry, material)
  this.scene.add(mesh)
}

// Draw a wall
APP.prototype.wall = function (x, z, angle) {
  let geometry = new THREE.PlaneGeometry(this.wallWidth, this.wallHeight, 100, 100)
  geometry.rotateY(angle)

  let textureLoader = new THREE.TextureLoader()
  let texture = textureLoader.load('images/misc/wall.jpg')

  let material = new THREE.MeshBasicMaterial({
    map: texture
  })
  
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(20, 2)

  let mesh = new THREE.Mesh(geometry, material)
  this.scene.add(mesh)
  mesh.position.setX(x).setY(100).setZ(z)
}

// Create Pseudo-Pommel
APP.prototype.sphere = function (callback) {
  // let listener = new THREE.AudioListener()
  // this.camera.add(listener)

  // let sound = new THREE.PositionalAudio(listener)
  // sound.setLoop(1)
  // let audioLoader = new THREE.AudioLoader()
  // audioLoader.load('sounds/hedwig.mp3', function (buffer) {
  //   sound.setBuffer(buffer)
  //   sound.setRefDistance(45)
  //   sound.play()
  // })

  let geometry = new THREE.SphereGeometry(1, 6, 6)
  let material = new THREE.MeshBasicMaterial({
    color: 0x000000
  })
  let obj = new THREE.Mesh(geometry, material)
  if (callback != undefined)
    callback(obj)
  this.scene.add(obj)
  // obj.add(sound)
}

// Create Pseudo-Arm
APP.prototype.arm = function (callback, callback2) {
  let obj = new THREE.Object3D()
  
  let geometry = new THREE.BoxGeometry(1, 1, 10)
  let material = new THREE.MeshBasicMaterial({
    color: 0xA98765
  })
  obj.add (new THREE.Mesh(geometry, material))

  geometry = new THREE.BoxGeometry(1.8, 0.5, 3)
  material = new THREE.MeshBasicMaterial({
    color: 0xA98775
  })
  let hand = new THREE.Object3D()
  hand.add(new THREE.Mesh(geometry, material))
  
  geometry = new THREE.BoxGeometry(1.4, 0.5, 0.5)
  
  let finger = new THREE.Mesh(geometry, material)
  finger.position.setX(-1.5).setZ(1)
  hand.add(finger)

  hand.position.setZ(-6)
  obj.add(hand)

  if (callback != undefined)
    callback([obj, hand])
  this.scene.add(obj)
  if (callback2 != undefined)
    callback2(obj)

  hand.rotateX(Math.PI/6).rotateZ(-Math.PI/6).translateY(0.5).translateX(-0.3)
  finger.rotateY(-Math.PI/4).rotateZ(Math.PI/8).translateZ(-0.6).translateX(-0.3)
}