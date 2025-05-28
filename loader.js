/**
 * DORIK UNIFIED SYSTEM v2.0 - MAIN LOADER
 * Smart module loader for optimized performance
 * Place this script in Dorik footer
 */

(function() {
  'use strict';

  // === CONFIGURATION ===
  const GITHUB_CDN = 'https://yourname.github.io/dorik-modules';
  const VERSION = '2.0';
  const DEBUG = true;

  // === CORE UTILITIES ===
  const Core = {
    // Logger
    log(...args) {
      if (DEBUG) console.log(`[Dorik v${VERSION}]`, ...args);
    },

    // Module loader
    loadedModules: new Set(),
    
    async loadModule(moduleName) {
      if (this.loadedModules.has(moduleName)) {
        return window[`Dorik${moduleName}`];
      }
      
      try {
        const script = document.createElement('script');
        script.src = `${GITHUB_CDN}/${moduleName.toLowerCase()}.min.js?v=${VERSION}`;
        script.async = true;
        
        const loadPromise = new Promise((resolve, reject) => {
          script.onload = () => {
            this.loadedModules.add(moduleName);
            this.log(`✅ Module loaded: ${moduleName}`);
            resolve(window[`Dorik${moduleName}`]);
          };
          script.onerror = () => {
            this.log(`❌ Failed to load: ${moduleName}`);
            reject(new Error(`Failed to load ${moduleName}`));
          };
        });
        
        document.head.appendChild(script);
        return await loadPromise;
        
      } catch (error) {
        this.log(`Error loading ${moduleName}:`, error);
        return null;
      }
    },

    // Batch load multiple modules
    async loadModules(moduleNames) {
      const promises = moduleNames.map(name => this.loadModule(name));
      return Promise.allSettled(promises);
    },

    // Device detection (inline for performance)
    getDeviceInfo() {
      const width = window.innerWidth;
      const isMobile = width <= 768;
      const userAgent = navigator.userAgent.toLowerCase();
      
      return {
        device: isMobile ? 'mobile' : (width <= 1024 ? 'tablet' : 'desktop'),
        isMobile: isMobile,
        screenWidth: width,
        screenHeight: window.innerHeight,
        isSlowConnection: navigator.connection?.effectiveType === '2g' || false
      };
    },

    // Find container ID
    findContainerId(element) {
      let container = element;
      while (container && !container.id) {
        container = container.parentElement;
        if (!container) break;
      }
      return container?.id || null;
    }
  };

  // === SMART LOADER SYSTEM ===
  const SmartLoader = {
    // Preload critical modules when page is idle
    async preloadCritical() {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(async () => {
          this.log('🔄 Preloading critical modules...');
          await Core.loadModules(['Config', 'Cache', 'Tracking']);
          
          // Initialize tracking immediately after load
          if (window.DorikTracking) {
            window.DorikTracking.init();
          }
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(async () => {
          await Core.loadModules(['Config', 'Cache', 'Tracking']);
          if (window.DorikTracking) {
            window.DorikTracking.init();
          }
        }, 2000);
      }
    },

    // Load gallery on demand
    async loadGallery() {
      const gallery = await Core.loadModule('Gallery');
      if (gallery) {
        await gallery.init();
      }
      return gallery;
    },

    // Load Firebase on demand
    async loadFirebase() {
      const firebase = await Core.loadModule('Firebase');
      if (firebase) {
        await firebase.init();
      }
      return firebase;
    },

    // Load forms on demand
    async loadForms() {
      const forms = await Core.loadModule('Forms');
      if (forms) {
        await forms.init();
      }
      return forms;
    },

    log(...args) {
      Core.log(...args);
    }
  };

  // === INSTANT EVENT HANDLERS ===
  const EventHandlers = {
    // Handle gallery clicks with instant response
    async handleGalleryClick(e) {
      const element = e.target.closest('[data-field="img_main"], [data-field="see_more"]');
      if (!element) return;
      
      e.preventDefault();
      
      // Show loading immediately
      this.showLoading(element);
      
      try {
        // Load required modules
        const [gallery, firebase] = await Promise.all([
          SmartLoader.loadGallery(),
          SmartLoader.loadFirebase()
        ]);
        
        if (!gallery || !firebase) {
          this.showError('Không thể tải gallery');
          return;
        }
        
        // Get container ID
        const containerId = Core.findContainerId(element);
        if (!containerId) {
          this.showError('Không tìm thấy ID container');
          return;
        }
        
        // Fetch and open gallery
        const productData = await firebase.fetchProduct(containerId);
        if (!productData) {
          this.showError('Không thể tải dữ liệu sản phẩm');
          return;
        }
        
        const images = firebase.getPrioritizedImages(productData);
        if (images.length === 0) {
          this.showError('Không tìm thấy hình ảnh');
          return;
        }
        
        await gallery.open(images);
        
        // Track gallery view
        if (window.DorikTracking) {
          window.DorikTracking.trackGallery(containerId);
        }
        
      } catch (error) {
        Core.log('Gallery error:', error);
        this.showError('Lỗi khi mở gallery');
      } finally {
        this.hideLoading();
      }
    },

    // Handle order clicks
    async handleOrderClick(e) {
      const element = e.target.closest('[data-field="order"]');
      if (!element) return;
      
      e.preventDefault();
      
      const containerId = Core.findContainerId(element);
      if (!containerId) return;
      
      // Load forms module
      const forms = await SmartLoader.loadForms();
      if (forms) {
        await forms.openOrder(containerId);
      } else {
        // Fallback to direct URL
        this.openOrderFallback(containerId);
      }
    },

    // Handle platform clicks
    handlePlatformClick(e) {
      const element = e.target.closest('[data-field^="link_"]');
      if (!element) return;
      
      const platform = element.getAttribute('data-field').replace('link_', '');
      const containerId = Core.findContainerId(element);
      
      if (containerId && window.DorikTracking) {
        window.DorikTracking.trackPlatform(platform, containerId);
      }
    },

    // Show loading indicator
    showLoading(element) {
      const loader = document.createElement('div');
      loader.id = 'dorik-loader';
      loader.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 999999;
        font-family: Arial, sans-serif;
        text-align: center;
      `;
      loader.innerHTML = `
        <div style="margin-bottom: 10px;">⏳</div>
        <div>Đang tải...</div>
      `;
      document.body.appendChild(loader);
    },

    // Hide loading indicator
    hideLoading() {
      const loader = document.getElementById('dorik-loader');
      if (loader) {
        loader.remove();
      }
    },

    // Show error message
    showError(message) {
      this.hideLoading();
      
      const error = document.createElement('div');
      error.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 999999;
        font-family: Arial, sans-serif;
        text-align: center;
        max-width: 300px;
      `;
      error.innerHTML = `
        <div style="margin-bottom: 15px;">⚠️</div>
        <div style="margin-bottom: 15px;">${message}</div>
        <button onclick="this.parentElement.remove()" style="
          background: white;
          color: black;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">Đóng</button>
      `;
      document.body.appendChild(error);
      
      // Auto remove after 5 seconds
      setTimeout(() => {
        if (error.parentNode) {
          error.remove();
        }
      }, 5000);
    },

    // Fallback order form
    openOrderFallback(containerId) {
      const deviceInfo = Core.getDeviceInfo();
      const urlParams = new URLSearchParams(window.location.search);
      const affiliateId = urlParams.get('aff') || urlParams.get('ref') || 'direct';
      
      let url = `https://tally.so/r/31xoq1?container_id=${containerId}&device=${deviceInfo.device}&affiliate_id=${affiliateId}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // === INITIALIZATION ===
  const init = () => {
    Core.log('🚀 Initializing Dorik Unified System v2.0');
    
    // Setup event delegation
    document.addEventListener('click', EventHandlers.handleGalleryClick);
    document.addEventListener('click', EventHandlers.handleOrderClick);
    document.addEventListener('click', EventHandlers.handlePlatformClick);
    
    // Preload critical modules when page is ready
    SmartLoader.preloadCritical();
    
    // Track page view
    const deviceInfo = Core.getDeviceInfo();
    const containersCount = document.querySelectorAll('[id*="_"]').length;
    
    Core.log('📊 Page loaded:', {
      device: deviceInfo.device,
      containers: containersCount,
      url: window.location.href
    });
    
    // Setup performance monitoring
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perf = performance.getEntriesByType('navigation')[0];
          if (perf) {
            Core.log('⚡ Performance:', {
              loadTime: Math.round(perf.loadEventEnd - perf.loadEventStart),
              domReady: Math.round(perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart)
            });
          }
        }, 1000);
      });
    }
    
    Core.log('✅ System initialized successfully');
  };

  // === GLOBAL API ===
  window.DorikSystem = {
    version: VERSION,
    loadModule: (name) => Core.loadModule(name),
    log: (...args) => Core.log(...args),
    
    // Manual triggers
    openGallery: async (containerId) => {
      const gallery = await SmartLoader.loadGallery();
      const firebase = await SmartLoader.loadFirebase();
      if (gallery && firebase) {
        const data = await firebase.fetchProduct(containerId);
        const images = firebase.getPrioritizedImages(data);
        await gallery.open(images);
      }
    },
    
    openOrder: async (containerId) => {
      const forms = await SmartLoader.loadForms();
      if (forms) {
        await forms.openOrder(containerId);
      }
    },
    
    // Status
    get loadedModules() { return Array.from(Core.loadedModules); }
  };

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
