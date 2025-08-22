  async function start() {
    if (!navigator.gpu) {
      fail('this browser does not support WebGPU');
      return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      fail('this browser supports webgpu but it appears disabled');
      return;
    }

    const device = await adapter.requestDevice();
    device.lost.then((info) => {
      console.error(`WebGPU device was lost: ${info.message}`);

      // 'reason' will be 'destroyed' if we intentionally destroy the device.
      if (info.reason !== 'destroyed') {
        // try again
        start();
      }
    });

    main(device);
  }
  start();

  function main(device) {

    const canvas = document.querySelector('canvas');
    const context = canvas.getContext('webgpu');
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device: device,
      format: presentationFormat,
    });

    const module = device.createShaderModule({
      label: 'my hardcoded triangle vertexes',
      code: `
      @vertex fn vertex_shader(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
          let pos = array(
          vec2f(0.0, 0.5),
          vec2f(-0.5, -0.5),
          vec2f(0.5, -0.5)
          );
          return vec4f(pos[vertexIndex], 0.0, 1.0);
        }

        @fragment fn fragment_shader() -> @location(0) vec4f {
          return vec4f(1.0, 0.0, 0.0, 1.0);
        }
      `,
    });

    const pipeline = device.createRenderPipeline({
      label: 'my hardcoded triangle pipeline',
      layout: 'auto',
      vertex: {
        entryPoint: 'vertex_shader',
        module,
      },
      fragment: {
        entryPoint: 'fragment_shader',
        module,
        targets: [{ format: presentationFormat }],
      },
    });

    const renderPassDescriptor = {
      label: 'my basic canvas render pass',
      colorAttachments: [
        {
          clearValue: [0.3, 0.3, 0.3, 1],
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    function render() {

      // gets the texture from the canvas context
      // and defines it as the surface to render to.
      renderPassDescriptor.colorAttachments[0].view = 
        context.getCurrentTexture().createView(); 

      const encoder = device.createCommandEncoder({
        label: 'my encoder'
      });

      const renderPass = encoder.beginRenderPass(renderPassDescriptor);
      renderPass.setPipeline(pipeline);
      renderPass.draw(3);
      renderPass.end();

      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    }

    render();
  }

