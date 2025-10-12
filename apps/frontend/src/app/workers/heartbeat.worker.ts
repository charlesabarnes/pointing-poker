/**
 * Web Worker for reliable heartbeat
 * This worker runs independently of the main thread and won't be throttled
 * when the tab is backgrounded, ensuring consistent heartbeat messages
 */

interface HeartbeatConfig {
  interval: number; // Interval in milliseconds
  enabled: boolean;
}

let heartbeatInterval: NodeJS.Timeout | null = null;
let config: HeartbeatConfig = {
  interval: 15000, // Default 15 seconds
  enabled: false
};

/**
 * Start the heartbeat interval
 */
function startHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    // Send heartbeat message to main thread
    postMessage({
      type: 'heartbeat',
      timestamp: Date.now()
    });
  }, config.interval);

  // Send immediate heartbeat on start
  postMessage({
    type: 'heartbeat',
    timestamp: Date.now()
  });
}

/**
 * Stop the heartbeat interval
 */
function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Listen for messages from the main thread
 */
addEventListener('message', (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
    case 'start':
      if (data?.interval) {
        config.interval = data.interval;
      }
      config.enabled = true;
      startHeartbeat();
      postMessage({
        type: 'started',
        interval: config.interval
      });
      break;

    case 'stop':
      config.enabled = false;
      stopHeartbeat();
      postMessage({
        type: 'stopped'
      });
      break;

    case 'update_interval':
      if (data?.interval) {
        config.interval = data.interval;
        if (config.enabled) {
          startHeartbeat(); // Restart with new interval
        }
      }
      break;

    case 'ping':
      // Respond to ping to check worker is alive
      postMessage({
        type: 'pong',
        timestamp: Date.now()
      });
      break;

    default:
      console.warn('Unknown message type:', type);
  }
});

// Export empty object for TypeScript
export {};
