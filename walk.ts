    import * as THREE from 'three'
    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
    import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

    import * as CANNON from 'cannon-es'
    import gsap from "gsap"
    import CannonUtils from './cannonUtils'
    import CannonDebugRenderer from './cannonDebugRenderer'
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('./draco/')
    
    const gltfLoader = new GLTFLoader()
    gltfLoader.setDRACOLoader(dracoLoader)

    gltfLoader.load(
        'models/map3.glb',
        (gltf) => {
            const loading  = document.getElementById('loading') as HTMLInputElement
            const navigate = document.getElementById( 'navigate' ) as HTMLInputElement
            let clicked = false //navigate button
            
            const scene = new THREE.Scene()

            scene.fog = new THREE.Fog('#60a3e0', 0.1, 150)

            const camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            )
            camera.position.set(0,3,-2)
            scene.add(camera)
            //ambient light
            var aLight = new THREE.AmbientLight( 0xffffff )
            scene.add( aLight ) 

            const renderer = new THREE.WebGLRenderer()
            renderer.setClearColor('#60a3e0')
            renderer.useLegacyLights = true // this option is to load light embed on glb file.
            renderer.setSize(window.innerWidth, window.innerHeight)
            renderer.shadowMap.enabled = true
            document.body.appendChild(renderer.domElement)

            const raycaster = new THREE.Raycaster()
            
            const world = new CANNON.World()
            const cannonDebugRenderer = new CannonDebugRenderer(scene, world)

            world.gravity.set(0, -9.82, 0)
            world.broadphase = new CANNON.NaiveBroadphase()
            ;(world.solver as CANNON.GSSolver).iterations = 10
            
            const groundMaterial = new CANNON.Material('groundMaterial')
            const slipperyMaterial = new CANNON.Material('slipperyMaterial')
            const slippery_ground_cm = new CANNON.ContactMaterial(
                groundMaterial,
                slipperyMaterial,
                {
                    friction: 0,
                    restitution: 0.3,
                    contactEquationStiffness: 1e8,
                    contactEquationRelaxation: 3,
                }
            )
            world.addContactMaterial(slippery_ground_cm)
        
            // Character Collider
            const characterCollider = new THREE.Object3D()
            const colliderShape = new CANNON.Sphere(0.5)
            const colliderBody = new CANNON.Body({ mass: 1, material: slipperyMaterial })
        
            let mixer: THREE.AnimationMixer
            let modelReady = false
            let modelMesh: THREE.Object3D
            let targetMesh: THREE.Object3D

            const animationActions: THREE.AnimationAction[] = []
            let activeAction: THREE.AnimationAction
            let lastAction: THREE.AnimationAction

            let mapModel = gltf.scene

            scene.add(mapModel)

            let cityMesh: THREE.Object3D

            const normalMaterial = new THREE.MeshNormalMaterial() 
            gltf.scene.traverse(function (child) {
                if (child.name == 'Rectangle031' || child.name == 'Rectangle001' || child.name == 'Rectangle003'|| child.name == 'Rectangle004' || child.name == 'Rectangle005' || child.name == 'Rectangle006'|| child.name == 'Rectangle007'|| child.name == 'Rectangle008'|| child.name == 'Rectangle009'|| child.name == 'Rectangle015' || child.name == 'Rectangle016'|| child.name == 'Rectangle033'|| child.name == 'Rectangle019' || child.name == 'Rectangle025' || child.name == 'Rectangle027'|| child.name == 'Rectangle006'|| child.name == 'Rectangle007'|| child.name == 'Rectangle008'|| child.name == 'Rectangle009' || child.name == 'Rectangle011' || child.name == 'Rectangle012' || child.name == 'Rectangle015' || child.name == 'Rectangle016'|| child.name == 'Rectangle033'|| child.name == 'Rectangle019' || child.name == 'Rectangle025' || child.name == 'Rectangle030' || child.name == 'Rectangle026'||child.name=='Rectangle010') {
                    cityMesh = child
                    const position = new THREE.Vector3()
                    cityMesh.getWorldPosition(position)
                    const cityBody = new CANNON.Body({ mass: 0, material: groundMaterial })

                    const cityShape = CannonUtils.CreateTrimesh(
                        (cityMesh as THREE.Mesh).geometry
                    )
                    cityBody.position.x = position.x
                    cityBody.position.y = position.y
                    cityBody.position.z = position.z
                    cityBody.addShape(cityShape)
                    world.addBody(cityBody)
                }
            })
            console.log('loaded map')
            gltfLoader.load(
                'models/Avatar.glb',
                (gltf) => {
                    const orbitControls = new OrbitControls(camera, renderer.domElement) 
                    const inputVelocity = new THREE.Vector3()
                    const velocity = new CANNON.Vec3()
                    orbitControls.enableDamping = true
                    orbitControls.dampingFactor = 0.05
                    orbitControls.minPolarAngle = Math.PI/3
                    orbitControls.maxPolarAngle = Math.PI/3
                    orbitControls.enableZoom = false
                    orbitControls.enabled = false
                    
                    mixer = new THREE.AnimationMixer(gltf.scene)
                    let animationAction = mixer.clipAction(gltf.animations[0])
                    animationActions.push(animationAction)
                    animationActions.push(mixer.clipAction(gltf.animations[1]))
                    animationActions.push(mixer.clipAction(gltf.animations[2]))
                    console.log(animationActions)
                    activeAction = animationActions[1]
                    activeAction.loop = THREE.LoopRepeat
                    activeAction.play()
                    scene.add(gltf.scene)
                    modelMesh = gltf.scene
                    modelMesh.add(camera)
                    
                    console.log('loaded Eve Idle')
                    
                    const creatCollider = () => {
                        characterCollider.position.x = 0
                        characterCollider.position.y = 3
                        characterCollider.position.z = 0
                        scene.add(characterCollider)
                    
                    
                        colliderBody.addShape(colliderShape, new CANNON.Vec3(0, 0.5, 0))
                        colliderBody.addShape(colliderShape, new CANNON.Vec3(0, -0.5, 0))
                        colliderBody.position.set(
                            characterCollider.position.x,
                            characterCollider.position.y,
                            characterCollider.position.z
                        )
                        colliderBody.linearDamping = 0.95
                        colliderBody.angularFactor.set(0, 1, 0) // prevents rotation X,Z axis
                        world.addBody(colliderBody)

                        loading.style.display = 'none'

                        gsap.from(camera.position, {
                            x: 0,
                            y: 30,
                            z: -80,
                            duration: 3
                        })
                    }
                
                    const setAction = (toAction: THREE.AnimationAction, loop: Boolean) => {
                        if (toAction != activeAction) {
                            lastAction = activeAction
                            activeAction = toAction
                            lastAction.fadeOut(0.2)
                            activeAction.reset()
                            activeAction.fadeIn(0.2)
                            activeAction.play()
                            if (!loop) {
                                activeAction.clampWhenFinished = true
                                activeAction.loop = THREE.LoopOnce
                            }
                        }
                    }

                    let canJump = true
                    const contactNormal = new CANNON.Vec3()
                    const upAxis = new CANNON.Vec3(0, 1, 0)
                    colliderBody.addEventListener('collide', function (e: any) {
                        const contact = e.contact
                        if (contact.bi.id == colliderBody.id) {
                            contact.ni.negate(contactNormal)
                        } else {
                            contactNormal.copy(contact.ni)
                        }
                        if (contactNormal.dot(upAxis) > 0.5) {
                            // console.log('ooooooooooooooooooooooook')
                            // if(inputVelocity.x==0&&inputVelocity.z==0){
                            //     setAction(animationActions[0], true)
                            // }
                            // else{
                            //     setAction(animationActions[1], true)
                            // }
                        }
                    })
                    modelReady = true
                    setAction(animationActions[0], true)
                    creatCollider()
                    const mouse = new THREE.Vector2()
                    renderer.domElement.addEventListener('mousemove', event => {
                        if (clicked == true) {
                            mouse.x = (event.clientX / window.innerWidth) * 2 - 1
                            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

                            raycaster.setFromCamera(mouse, camera)
                            
                            const intersects = raycaster.intersectObjects(scene.children)
                            if (intersects.length > 0) {
                                mapModel.children.map((block) => {
                                    // gsap.to(intersects[0].object.parent.children[16].scale, {
                                    //     x: 1,
                                    //     y: 1,
                                    //     z: 1,
                                    //     duration: 1,
                                    // })
                                })
                                if(intersects[0].object.parent.name=="Block_1"||intersects[0].object.parent.name=="Block_2"||intersects[0].object.parent.name=="Block_3"||intersects[0].object.parent.name=="Block_4")
                                {
                                    // const boxHelper = new THREE.BoxHelper(intersects[0].object.parent.children[16], 0xff0000)
                                    // scene.add(boxHelper)
                                    // intersects[0].object.parent.children[16].vertices.forEach(vertex => {
                                    //     vertex.y += 2 // Change the height value as needed
                                    // })
                                    // const line = new THREE.LineSegments(new THREE.EdgesGeometry(intersects[0].object.parent.children[16].geometry), new THREE.LineBasicMaterial({color: 0x00000}))
                                    // scene.add(line)
                                    // gsap.to(intersects[0].object.parent.children[16].scale, {
                                    //     x: 1.2,
                                    //     y: 1.2,
                                    //     z: 1.2,
                                    //     duration: 1,
                                    // })
                                }       
                            }
                        }
                    })
                    // renderer.domElement.addEventListener('dblclick', event => {
                        
                    //     if (clicked) {
                    //         // Set the mouse coordinates (normalized between -1 and 1)
                    //         mouse.x = (event.clientX / window.innerWidth) * 2 - 1
                    //         mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

                    //         // Set the origin of the raycaster to the camera position
                    //         raycaster.setFromCamera(mouse, camera)

                    //         // Find all intersections between the ray and objects in the scene
                    //         const intersects = raycaster.intersectObjects(scene.children)
                    //         if (intersects.length > 0) {
                    //             const selectedObject = intersects[0].object
                    //             if(intersects[0].object.parent.name=="Block_1"||intersects[0].object.parent.name=="Block_2"||intersects[0].object.parent.name=="Block_3"||intersects[0].object.parent.name=="Block_4")
                    //             colliderBody.position.set(intersects[0].object.parent.position.x,2,intersects[0].object.parent.position.z)
                    //             targetMesh = null
                    //             navigate.click()
                    //         }
                    //     }
                    //     else {
                    //         if (canJump === true) {
                    //             colliderBody.velocity.y = 10
                    //             setAction(animationActions[2], false)
                    //         }
                    //         canJump = false
                    //     }
                        
                    // })
                    renderer.domElement.addEventListener('click', event => {
                        
                        if (!clicked) {
                            // Set the mouse coordinates (normalized between -1 and 1)
                            mouse.x = (event.clientX / window.innerWidth) * 2 - 1
                            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

                            // Set the origin of the raycaster to the camera position
                            raycaster.setFromCamera(mouse, camera)

                            // Find all intersections between the ray and objects in the scene
                            const intersects = raycaster.intersectObjects(scene.children)
                            // If there is at least one intersection, select the first object in the list
                            if (intersects.length > 0) {
                                //Rectangle031, Rectangle015,Rectangle010,Rectangle025
                                if(intersects[0].object.name=='Rectangle031'||intersects[0].object.name=='Rectangle015'||intersects[0].object.name=='Rectangle010'||intersects[0].object.name=='Rectangle025'){
                                    //mouse pointer mesh
                                    targetMesh = intersects[0]

                                    const ringGeometry =  new THREE.RingGeometry(0.1, 0.2)
                                    // Define the material
                                    const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide })
                                    // Create the mesh
                                    const ringMesh = new THREE.Mesh(ringGeometry, material)
                                    ringMesh.rotation.x = Math.PI / 2 //
                                    ringMesh.position.set(targetMesh.point.x, targetMesh.point.y, targetMesh.point.z)
                                    scene.add(ringMesh)
                                    gsap.to(ringMesh.scale, {
                                        x: 0,
                                        y: 0,
                                        z: 0,
                                        duration: 1,
                                    })
                                }
                                
                            }

                        }
                        
                    })
                    window.addEventListener('resize', onWindowResize, false)
                    function onWindowResize() {
                        camera.aspect = window.innerWidth / window.innerHeight
                        camera.updateProjectionMatrix()
                        renderer.setSize(window.innerWidth, window.innerHeight)
                        render()
                    }
            

                    const targetQuaternion = new THREE.Quaternion()
                    let distance = 0
                    let distance1 = 0
                
                    const clock = new THREE.Clock()
                    let delta = 0

                    let rotation = 0
                    const rotationSpeed = 0.001

                    function animate() {
                        requestAnimationFrame(animate)

                        if (modelReady) {
                            
                            const p = characterCollider.position
                            p.y -= 1
                            modelMesh.position.y = characterCollider.position.y
                            distance = modelMesh.position.distanceTo(p)
                            if(targetMesh)
                                distance1 = colliderBody.position.distanceTo(targetMesh.point)
                
                            const rotationMatrix = new THREE.Matrix4()
                            if(distance1>1){
                                rotationMatrix.lookAt(p, modelMesh.position, modelMesh.up)
                                targetQuaternion.setFromRotationMatrix(rotationMatrix)

                            }
                
                            if (!modelMesh.quaternion.equals(targetQuaternion)) {
                                modelMesh.quaternion.rotateTowards(targetQuaternion, delta * 10)
                            }
                
                            if (canJump) {

                                inputVelocity.set(0, 0, 0)
                                
                                if(targetMesh) {
                                    
                                    // const threshold = 0.5
                                    // const velocityFactor = 0.1
                                    // if (Math.abs(targetMesh.point.x - modelMesh.position.x) < threshold) {
                                    //     inputVelocity.x = 0
                                    // } else {
                                    //     inputVelocity.x = velocityFactor * Math.sign(targetMesh.point.x - modelMesh.position.x)
                                    // }

                                    // if (Math.abs(targetMesh.point.z - modelMesh.position.z) < threshold) {
                                    //     inputVelocity.z = 0
                                    // } else {
                                    //     inputVelocity.z = velocityFactor * Math.sign(targetMesh.point.z - modelMesh.position.z)
                                    // }
                                    // const rate = Math.abs(targetMesh.point.x - modelMesh.position.x)/Math.abs(targetMesh.point.z - modelMesh.position.z);
                                    // if(rate>1){
                                    //     inputVelocity.z = inputVelocity.z/rate;
                                    // }
                                    // else {
                                    //     inputVelocity.x = inputVelocity.x*rate;

                                    // }
                                    gsap.to(colliderBody.position, {
                                        x: targetMesh.point.x,
                                        // y: targetMesh.point.y,
                                        z: targetMesh.point.z,
                                        duration: distance1*2,
                                    })
                                
                                }
                            }
                            
                            modelMesh.position.lerp(characterCollider.position, 0.1)
                        }
                        
                        // if (Math.abs(inputVelocity.x*10)>0||Math.abs(inputVelocity.z*10)>0) {
                        if (distance1>1) {
                            setAction(animationActions[1], true)
                            mixer.update(delta * distance * 5)
                        } 
                        else {
                            
                            setAction(animationActions[0], true)
                            mixer.update(delta)
                        }

                        velocity.set(inputVelocity.x, inputVelocity.y, inputVelocity.z)
                        colliderBody.applyImpulse(velocity)
                
                        delta = Math.min(clock.getDelta(), 0.1)
                        world.step(delta)
                
                        // cannonDebugRenderer.update()
                
                        characterCollider.position.set(
                            colliderBody.position.x,
                            colliderBody.position.y,
                            colliderBody.position.z
                        )
                        if(clicked) {
                            rotation += rotationSpeed
                            // mapModel.rotation.y = rotation
                            // cityMesh.rotation.y = rotation
                        }
                        orbitControls.update() 
                        render()
                
                    }
                
                    function render() {
                        if(!clicked){
                            camera.lookAt(modelMesh.position.x, modelMesh.position.y, modelMesh.position.z)
                        }
                        
                        camera.updateProjectionMatrix()
                        renderer.render(scene, camera)
                    }
                
                    animate()
                    navigate.addEventListener( 'click', function () {
                        if (clicked == false) {
                            clicked = true
                            orbitControls.enabled = true 
                            // orbitControls.target.set(0,0,0)
                        
                            gsap.to(camera.position, {
                                x: 0,
                                y: 30,
                                z: -80,
                                duration: 4,
                                onStart: () => {
                                    orbitControls.enabled = false
                                },
                                onUpdate: () => {
                                    // let target = camera.position.clone().add(cameraDirection)
                                    // orbitControls.target = target
                                },
                                onComplete: () => {
                                    orbitControls.enabled = true
                                },
                            })
                            
                        } else {
                            clicked = false
                            orbitControls.enabled = false 
                            // orbitControls.target.set(modelMesh.position)
                            // orbitControls.update() 

                            gsap.to(camera.position, {
                                x: 0,
                                y: 3,
                                z: -2,
                                duration: 4,
                                onStart: () => {
                                    orbitControls.enabled = false
                                },
                                onUpdate: () => {
                                    // let target = camera.position.clone().add(cameraDirection)
                                    // orbitControls.target = target
                                },
                                onComplete: () => {
                                    orbitControls.enabled = false
                                },
                            })
                        }
                        
                    })
                    
                },
                (xhr) => {
                    // console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
                },
                (error) => {
                    console.log(error)
                }
            )
            
        },
        (xhr) => {
            // console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        (error) => {
            console.log(error)
        }
    )

    