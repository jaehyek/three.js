/**
 * @author Ayman Habib based on mrdoob / http://mrdoob.com/
 */

var OpenSimViewport = function ( editor ) {

	var signals = editor.signals;

	var container = new UI.Panel();
	container.setId( 'viewport' );
	container.setPosition( 'absolute' );

	container.add( new Viewport.Info( editor ) );

	var scene = editor.scene;
	var sceneHelpers = editor.sceneHelpers;
	//var showHelpers = editor.showDebug();
	var dollyCameraEye = editor.cameraEye;
	var objects = [];

    // AnimationRecording
	var capturer;
	// helpers

	var grid = new THREE.GridHelper( 30, 1 );
	//OPENSIM sceneHelpers.add( grid );

	//

	var camera = editor.camera;
	var dollyCamera = editor.dolly_camera;
	//

	var selectionBox = new THREE.BoxHelper();
	selectionBox.material.depthTest = false;
	selectionBox.material.transparent = true;
	selectionBox.visible = false;
	sceneHelpers.add( selectionBox );

	var objectPositionOnDown = null;
	var objectRotationOnDown = null;
	var objectScaleOnDown = null;

	var transformControls = new THREE.TransformControls(camera, container.dom);
	editor.control = transformControls;

	var animating = false;
	transformControls.addEventListener( 'change', function () {

		var object = transformControls.object;

		if ( object !== undefined ) {

			selectionBox.update( object );

			if ( editor.helpers[ object.id ] !== undefined ) {

				editor.helpers[ object.id ].update();

			}

			signals.refreshSidebarObject3D.dispatch( object );

		}

		render();

	} );
	transformControls.addEventListener( 'mouseDown', function () {

		var object = transformControls.object;

		objectPositionOnDown = object.position.clone();
		objectRotationOnDown = object.rotation.clone();
		objectScaleOnDown = object.scale.clone();

		controls.enabled = false;

	} );
	transformControls.addEventListener( 'mouseUp', function () {

		var object = transformControls.object;

		if ( object !== undefined ) {

			switch ( transformControls.getMode() ) {

				case 'translate':

					if ( ! objectPositionOnDown.equals( object.position ) ) {

						editor.execute( new SetPositionCommand( object, object.position, objectPositionOnDown ) );

					}

					break;

				case 'rotate':

					if ( ! objectRotationOnDown.equals( object.rotation ) ) {

						editor.execute( new SetRotationCommand( object, object.rotation, objectRotationOnDown ) );

					}

					break;

				case 'scale':

					if ( ! objectScaleOnDown.equals( object.scale ) ) {

						editor.execute( new SetScaleCommand( object, object.scale, objectScaleOnDown ) );

					}

					break;

			}

		}

		controls.enabled = true;

	} );

	sceneHelpers.add( transformControls );

	// fog

	var oldFogType = "None";
	var oldFogColor = 0xaaaaaa;
	var oldFogNear = 1;
	var oldFogFar = 5000;
	var oldFogDensity = 0.00025;

	// object picking

	var raycaster = new THREE.Raycaster();
	var mouse = new THREE.Vector2();

	// events

	function getIntersects( point, objects ) {

		mouse.set( ( point.x * 2 ) - 1, - ( point.y * 2 ) + 1 );

		raycaster.setFromCamera( mouse, camera );

		return raycaster.intersectObjects( objects );

	}

	var onDownPosition = new THREE.Vector2();
	var onUpPosition = new THREE.Vector2();
	var onDoubleClickPosition = new THREE.Vector2();

	function getMousePosition( dom, x, y ) {

		var rect = dom.getBoundingClientRect();
		return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

	}

	function handleClick() {

		if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {

			var intersects = getIntersects( onUpPosition, objects );

			if ( intersects.length > 0 ) {

				var object = intersects[ 0 ].object;

				if ( object.userData.object !== undefined ) {

					// helper

					editor.select( object.userData.object );

				} else {

					editor.select( object );

				}

			} else {

				editor.select( null );

			}

			render();

		}

	}

	function onMouseDown( event ) {

		event.preventDefault();

		var array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'mouseup', onMouseUp, false );

	}

	function onMouseUp( event ) {

		var array = getMousePosition( container.dom, event.clientX, event.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'mouseup', onMouseUp, false );

	}

	function onTouchStart( event ) {

		var touch = event.changedTouches[ 0 ];

		var array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'touchend', onTouchEnd, false );

	}

	function onTouchEnd( event ) {

		var touch = event.changedTouches[ 0 ];

		var array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'touchend', onTouchEnd, false );

	}

	function onDoubleClick( event ) {

		var array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDoubleClickPosition.fromArray( array );

		var intersects = getIntersects( onDoubleClickPosition, objects );

		if ( intersects.length > 0 ) {

			var intersect = intersects[ 0 ];

			signals.objectFocused.dispatch( intersect.object );

		}

	}

	container.dom.addEventListener( 'mousedown', onMouseDown, false );
	container.dom.addEventListener( 'touchstart', onTouchStart, false );
	container.dom.addEventListener( 'dblclick', onDoubleClick, false );

	// controls need to be added *after* main logic,
	// otherwise controls.enabled doesn't work.

	var controls = new THREE.EditorControls( camera, container.dom );
	controls.addEventListener( 'change', function () {

		transformControls.update();
		signals.cameraChanged.dispatch( camera );

	} );

	// signals

	signals.editorCleared.add( function () {

		controls.center.set( 0, 0, 0 );
		render();

	} );

	signals.renderDebugChanged.add(function (show) {
	    sceneHelpers.visible = show;
	    render();
	});
	var clearColor;

	signals.themeChanged.add( function ( value ) {

		switch ( value ) {

			case 'css/light.css':
				//OPENSIM sceneHelpers.remove( grid );
				//OPENSIM grid = new THREE.GridHelper( 30, 1, 0x444444, 0x888888 );
				//OPENSIM sceneHelpers.add( grid );
				clearColor = 0xaaaaaa;
				break;
			case 'css/dark.css':
				//OPENSIM sceneHelpers.remove( grid );
				//OPENSIM grid = new THREE.GridHelper( 30, 1, 0xbbbbbb, 0x888888 );
				//OPENSIM sceneHelpers.add( grid );
				clearColor = 0x333333;
				break;

		}

		renderer.setClearColor( clearColor );

		render();

	} );

	signals.transformModeChanged.add( function ( mode ) {

		transformControls.setMode( mode );

	} );

	signals.snapChanged.add( function ( dist ) {

		transformControls.setTranslationSnap( dist );

	} );

	signals.spaceChanged.add( function ( space ) {

		transformControls.setSpace( space );

	} );

	signals.rendererChanged.add( function ( newRenderer ) {

		if ( renderer !== null ) {

			container.dom.removeChild( renderer.domElement );

		}

		renderer = newRenderer;

		renderer.autoClear = false;
		renderer.autoUpdateScene = false;
		renderer.setClearColor( clearColor );
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		container.dom.appendChild( renderer.domElement );

		render();

	} );

	signals.sceneGraphChanged.add( function () {

		render();

	});

	signals.defaultCameraApplied.add(function (newCenter) {
	    controls.center.copy(newCenter);
	});

	var saveTimeout;

	signals.cameraChanged.add( function () {

		render();

	} );

	signals.animationStarted.add(function () {
	    this.animating = true;
	    dollyCamera.aspect = camera.aspect;
	    dollyCamera.updateProjectionMatrix();
	    render();

	});
	signals.animationStopped.add(function () {
	    this.animating = false;
	    render();

	});

	signals.recordingStarted.add(function () {
	    // add frame to gif
	    capturer = new CCapture({
	        verbose: false,
	        display: true,
	        framerate: 20,
	        motionBlurFrames: 3,
	        quality: 100,
	        format: 'webm',
	        workersPath: '../../src/',
	        timeLimit: 5,
	        frameLimit: 0,
	        autoSaveTime: 0,
	        onProgress: function (p) { progress.style.width = (p * 100) + '%' }
	    });

	    capturer.start();

	});

	signals.recordingStopped.add(function () {
	    capturer.stop();
	    capturer.save();
	    // add frame to gif
	    //gif.render();
	    //gif.finishRendering();
	});

	signals.objectSelected.add(function (object) {

		selectionBox.visible = false;
		transformControls.detach();

		if ( object !== null ) {

			if ( object.geometry !== undefined ) {

				selectionBox.update( object );
				selectionBox.visible = true;

			}
            if (object.userData !== "NonEditable")
			    transformControls.attach( object );

		}

		render();

	} );

	signals.objectFocused.add( function ( object ) {

		controls.focus( object );

	} );

	signals.geometryChanged.add( function ( object ) {

		if ( object !== undefined ) {

			selectionBox.update( object );

		}

		render();
                var json = JSON.stringify({
                    "event": "geometry-changed",
                    "uuid": object.uuid,
                    "name": object.name,
                    "geometry": object.geometry.toJSON(),
                });
                sendText(json);
	} );

	signals.objectAdded.add( function ( object ) {

		object.traverse( function ( child ) {

			objects.push( child );

		} );

	} );

	signals.objectChanged.add( function ( object ) {

	    if (object === null) return;
	    if (editor.selected === object) {

			selectionBox.update( object );
			transformControls.update();

		}

		if ( object instanceof THREE.PerspectiveCamera ) {

			object.updateProjectionMatrix();

		}

		if ( editor.helpers[ object.id ] !== undefined ) {

			editor.helpers[ object.id ].update();

		}
                if ( object !== null ) {
                    // Send uuid of selected object across socket
                    var json = JSON.stringify({
                        "event": "transform-changed",
                        "uuid": object.uuid,
                        "name": object.name,
                        "position": object.position,
                        "rotation": object.rotation,
                        "scale": object.scale,
                    });
                    sendText(json);
                }
		render();

	} );

	signals.objectRemoved.add( function ( object ) {

		object.traverse( function ( child ) {

			objects.splice( objects.indexOf( child ), 1 );

		} );

	} );

	signals.helperAdded.add( function ( object ) {

		objects.push( object.getObjectByName( 'picker' ) );

	} );

	signals.helperRemoved.add( function ( object ) {

		objects.splice( objects.indexOf( object.getObjectByName( 'picker' ) ), 1 );

	} );

	signals.materialChanged.add( function ( material ) {

		render();
                var json = JSON.stringify({
                    "event": "material-changed",
                    "uuid": material.uuid,
                    "name": material.name,
                    "visible": material.visible,
                    "color": material.color,
                });
                sendText(json);
	} );

	signals.fogTypeChanged.add( function ( fogType ) {

		if ( fogType !== oldFogType ) {

			if ( fogType === "None" ) {

				scene.fog = null;

			} else if ( fogType === "Fog" ) {

				scene.fog = new THREE.Fog( oldFogColor, oldFogNear, oldFogFar );

			} else if ( fogType === "FogExp2" ) {

				scene.fog = new THREE.FogExp2( oldFogColor, oldFogDensity );

			}

			oldFogType = fogType;

		}

		render();

	} );

	signals.fogColorChanged.add( function ( fogColor ) {

		oldFogColor = fogColor;

		updateFog( scene );

		render();

	} );

	signals.fogParametersChanged.add( function ( near, far, density ) {

		oldFogNear = near;
		oldFogFar = far;
		oldFogDensity = density;

		updateFog( scene );

		render();

	} );

	signals.windowResize.add( function () {

		// TODO: Move this out?

		editor.DEFAULT_CAMERA.aspect = container.dom.offsetWidth / container.dom.offsetHeight;
		editor.DEFAULT_CAMERA.updateProjectionMatrix();

		camera.aspect = container.dom.offsetWidth / container.dom.offsetHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		render();

	} );

	signals.showGridChanged.add( function ( showGrid ) {

		grid.visible = showGrid;
		render();

	} );

	//

	var renderer = null;

	animate();

	//

	function updateFog( root ) {

		if ( root.fog ) {

			root.fog.color.setHex( oldFogColor );

			if ( root.fog.near !== undefined ) root.fog.near = oldFogNear;
			if ( root.fog.far !== undefined ) root.fog.far = oldFogFar;
			if ( root.fog.density !== undefined ) root.fog.density = oldFogDensity;

		}

	}

	function animate() {

	    render();
	    requestAnimationFrame(animate);
	    TWEEN.update();

		/*

		// animations

		if ( THREE.AnimationHandler.animations.length > 0 ) {

			THREE.AnimationHandler.update( 0.016 );

			for ( var i = 0, l = sceneHelpers.children.length; i < l; i ++ ) {

				var helper = sceneHelpers.children[ i ];

				if ( helper instanceof THREE.SkeletonHelper ) {

					helper.update();

				}

			}

			render();

		}

		*/

	}

	function render() {

		sceneHelpers.updateMatrixWorld();
		scene.updateMatrixWorld();
		stats.update();
		if (renderer != null) {
		    renderer.clear();

		    if (this.animating) {
		        var time = Date.now();
		        var looptime = 20 * 1000;
		        var t = (time % looptime) / looptime;

		        var pos = editor.dollyPath.getPointAt(t);
		        console.log('t='+t);
		        currentCamera = dollyCamera;
		        currentCamera.position.copy(pos);
		        //dollyCameraEye.position.copy(pos);
		        currentCamera.lookAt(new THREE.Vector3(0, 0, 0));
		    }
		    else
		        currentCamera = camera;

		    renderer.render(scene, currentCamera);

		    if (renderer instanceof THREE.RaytracingRenderer === false) {
		        if (sceneHelpers.visible)
		            renderer.render(sceneHelpers, camera);

		    }
		    if (capturer) capturer.capture(renderer.domElement);
		}
	}

	return container;

};
