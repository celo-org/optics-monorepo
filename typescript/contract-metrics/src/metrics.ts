import { collectDefaultMetrics, Gauge, register } from 'prom-client'
import express, { Response } from 'express'
import Logger from 'bunyan'

export class MetricCollector {
  private numDispatchedGauge: Gauge<string>
  private numProcessedGauge: Gauge<string>
  private numUnprocessedGauge: Gauge<string>

  private readonly logger: Logger

  constructor(logger: Logger) {
    this.logger = logger

    this.numDispatchedGauge = new Gauge({
      name: 'optics_number_messages_dispatched',
      help: 'Gauge that indicates how many messages have been dispatched for a network.',
      labelNames: ['network', 'environment']
    })

    this.numProcessedGauge = new Gauge({
      name: 'optics_number_messages_processed',
      help: 'Gauge that indicates how many messages have been processed for a network.',
      labelNames: ['network', 'environment']
    })

    this.numUnprocessedGauge = new Gauge({
      name: 'optics_number_messages_unprocessed',
      help: 'Gauge that indicates how many messages are unprocessed for a network.',
      labelNames: ['network', 'environment']
    })
  }
  /** 
   * Sets the state for a bridge.
   */
  setBridgeState(network: string, environment: string, dispatched: number, processed: number, unprocessed: number) {
    this.numDispatchedGauge.set({network, environment}, dispatched)
    this.numProcessedGauge.set({network, environment}, processed)
    this.numUnprocessedGauge.set({network, environment}, unprocessed)
  }

  /**
  * Starts a server that exposes metrics in the prometheus format
  */
  startServer(port: number) {
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw Error(`Invalid PrometheusPort value: ${port}`)
    }
    const server = express()
    server.get('/metrics', async (_, res: Response) => {
      res.set('Content-Type', register.contentType)
      res.end(await register.metrics())
    })
    // Enable collection of default metrics
    collectDefaultMetrics()

    this.logger.info(
      {
        endpoint: `http://0.0.0.0:${port}/metrics`,
      },
      'Prometheus metrics exposed'
    )
    server.listen(port)
  }
}