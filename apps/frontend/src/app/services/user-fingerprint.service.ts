import { Injectable } from '@angular/core';

/**
 * Service to generate and manage browser fingerprint for persistent user identification
 * This allows tracking users even when they change their display name
 */
@Injectable({
  providedIn: 'root'
})
export class UserFingerprintService {
  private readonly FINGERPRINT_KEY = 'POKER_USER_FINGERPRINT';
  private fingerprint: string | null = null;

  constructor() {
    this.fingerprint = this.getOrCreateFingerprint();
  }

  /**
   * Get the current user's fingerprint
   */
  public getFingerprint(): string {
    if (!this.fingerprint) {
      this.fingerprint = this.getOrCreateFingerprint();
    }
    return this.fingerprint;
  }

  /**
   * Get existing fingerprint from localStorage or create a new one
   */
  private getOrCreateFingerprint(): string {
    // Try to get existing fingerprint from localStorage
    const stored = localStorage.getItem(this.FINGERPRINT_KEY);
    if (stored) {
      return stored;
    }

    // Generate new fingerprint
    const newFingerprint = this.generateFingerprint();
    localStorage.setItem(this.FINGERPRINT_KEY, newFingerprint);
    return newFingerprint;
  }

  /**
   * Generate a unique browser fingerprint based on various browser characteristics
   */
  private generateFingerprint(): string {
    const components: string[] = [];

    // Screen information
    components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
    components.push(`avail:${screen.availWidth}x${screen.availHeight}`);

    // Timezone
    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    components.push(`offset:${new Date().getTimezoneOffset()}`);

    // Language
    components.push(`lang:${navigator.language}`);
    components.push(`langs:${navigator.languages.join(',')}`);

    // Platform and User Agent
    components.push(`ua:${navigator.userAgent}`);

    // Hardware concurrency (CPU cores)
    if ('hardwareConcurrency' in navigator) {
      components.push(`cores:${navigator.hardwareConcurrency}`);
    }

    // Device memory (if available)
    if ('deviceMemory' in navigator) {
      components.push(`mem:${(navigator as any).deviceMemory}`);
    }

    // Canvas fingerprint
    const canvasFingerprint = this.getCanvasFingerprint();
    if (canvasFingerprint) {
      components.push(`canvas:${canvasFingerprint}`);
    }

    // WebGL fingerprint
    const webglFingerprint = this.getWebGLFingerprint();
    if (webglFingerprint) {
      components.push(`webgl:${webglFingerprint}`);
    }

    // Add timestamp and random component to ensure uniqueness
    components.push(`ts:${Date.now()}`);
    components.push(`rnd:${Math.random().toString(36).substring(2)}`);

    // Hash all components together
    const fingerprintString = components.join('|');
    return this.hashString(fingerprintString);
  }

  /**
   * Generate canvas fingerprint
   */
  private getCanvasFingerprint(): string | null {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      canvas.width = 200;
      canvas.height = 50;

      // Draw text with specific styling
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Browser Fingerprint', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Browser Fingerprint', 4, 17);

      // Get canvas data
      return canvas.toDataURL().substring(0, 100);
    } catch (e) {
      return null;
    }
  }

  /**
   * Generate WebGL fingerprint
   */
  private getWebGLFingerprint(): string | null {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl || !(gl instanceof WebGLRenderingContext)) return null;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return null;

      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

      return `${vendor}~${renderer}`.substring(0, 50);
    } catch (e) {
      return null;
    }
  }

  /**
   * Simple string hashing function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to base36 and ensure it's positive
    return Math.abs(hash).toString(36).padStart(8, '0');
  }

  /**
   * Clear the stored fingerprint (useful for testing)
   */
  public clearFingerprint(): void {
    localStorage.removeItem(this.FINGERPRINT_KEY);
    this.fingerprint = null;
  }
}
