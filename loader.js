/**
 * LOADER.JS - Main Orchestrator & Event Handler
 * Loads all modules, initializes system, handles global events
 */

(function() {
  'use strict';

  // === DORIK SYSTEM LOADER ===
  window.DorikLoader = {
    
    loadedModules: new Set(),
    initializationPromise: null,
    
    // CDN base URL
    cdnBase: 'https://raw.githubusercontent.com/locpham1020/dorik-modules/main/',
    
    // Module configuration with dependencies
    modules: {
      config: {
        file: 'config.min.js',
        required: true,
        priority: 1
      },
      cache: {
        file: 'cache.min.js',
        required: true,
        priority: 2,
        depends: ['config']
      },
      firebase: {
        file: 'firebase.min.js',
        required: true,
        priority: 3,
        depends: ['config', 'cache']
      },
      tracking: {
        file: 'tracking.min.js',
        required: false,
        priority: 4,
        depends: ['config']
      },
      gallery: {
        file: 'gallery.min.js',
        required: false,
        priority: 5,
        depends: ['config', 'cache', 'firebase']
      },
      forms: {
        file: 'forms.min.js',
        required: false,
        priority: 6,
        depends: ['config']
      },
      lazy: {
        file: 'lazy.min.js',
        required: false,
        priority: 7,
        depends: ['config', 'firebase']
      }
    },

    // Initialize system
    async init(options = {}) {
      // Prevent multiple initializations
      if (this.initializationPromise) {
        return this.initializationPromise;
      }

      this.initializationPromise = this._performInit(options);
      return this.initializationPromise;
    },

    // Internal initialization
    async _performInit(options) {
      try {
        console.log('🚀 === DORIK UNIFIED SYSTEM v2.0 MODULAR ===');
        
        // Override CDN base if provided
        if (options.cdnBase) {
          this.cdnBase = options.cdnBase;
        }

        // Override module settings if provided
        if (options.modules) {
          Object.assign(this.modules, options.modules);
        }

        // Performance mark
        this.mark('dorik-init-start');

        // Load modules in priority order
        await this.loadModules();

        // Initialize modules
        await this.initializeModules();

        // Setup global event handlers
        this.setupGlobalEventHandlers();

        // Setup cleanup handlers
        this.setupCleanupHandlers();

        // Setup performance monitoring
        this.setupPerformanceMonitoring();

        // Performance measure
        this.mark('dorik-init-end');
        this.measure('dorik-total-init', 'dorik-init-start', 'dorik-init-end');

        console.log('✅ === DORIK SYSTEM READY ===');
        
        // Fire ready event
        this.fireReadyEvent();

        return true;

      } catch (error) {
        console.error('❌ Dorik initialization failed:', error);
        return false;
      }
    },

    // Load modules in priority order
    async loadModules() {
      console.log('📦 Loading modules...');
      
      // Sort modules by priority
      const sortedModules = Object.entries(this.modules)
        .sort(([,a], [,b]) => a.priority - b.priority);

      for (const [name, config] of sortedModules) {
        try {
          // Check dependencies
          if (config.depends) {
            for (const dep of config.depends) {
              if (!this.loadedModules.has(dep)) {
                throw new Error(`Dependency ${dep} not loaded for ${name}`);
              }
            }
          }

          // Load module
          await this.loadModule(name, config);
          this.loadedModules.add(name);
          
        } catch (error) {
          console.error(`❌ Failed to load module ${name}:`, error);
          
          if (config.required) {
            throw new Error(`Required module ${name} failed to load: ${error.message}`);
          } else {
            console.warn(`⚠️ Optional module ${name} skipped due to error`);
          }
        }
      }
    },

    // Load individual module
    async loadModule(name, config) {
      const url = this.cdnBase + config.file;
      
      try {
        this.mark(`module-${name}-start`);
        
        // Create script element
        const script = document.createElement('script');
        script.src = url;
        script.id = `dorik-module-${name}`;
        
        // Load script
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Failed to load ${url}`));
          document.head.appendChild(script);
        });
        
        this.mark(`module-${name}-end`);
        this.measure(`module-${name}`, `module-${name}-start`, `module-${name}-end`);
        
        console.log(`✅ Module loaded: ${name}`);
        
      } catch (error) {
        throw new Error(`Module ${name} load failed: ${error.message}`);
      }
    },

    // Initialize modules
    async initializeModules() {
      console.log('⚙️ Initializing modules...');
      
      // Initialize in order
      const initOrder = ['config', 'cache', 'firebase', 'tracking', 'gallery', 'forms', 'lazy'];
      
      for (const moduleName of initOrder) {
        if (!this.loadedModules.has(moduleName)) {
          continue;
        }
        
        try {
          await this.initializeModule(moduleName);
        } catch (error) {
          console.error(`❌ Module ${moduleName} initialization failed:`, error);
          
          if (this.modules[moduleName]?.required) {
            throw error;
          }
        }
      }
    },

    // Initialize individual module
    async initializeModule(moduleName) {
      const moduleMap = {
        config: () => {
          // Config module auto-initializes, just verify
          if (!window.DorikConfig || !window.DorikUtils || !window.DorikState) {
            throw new Error('Config module not properly loaded');
          }
        },
        cache: () => window.DorikCache?.init(),
        firebase: () => window.DorikFirebase?.init(),
        tracking: () => window.DorikTracking?.init(),
        gallery: () => window.DorikGallery?.init(),
        forms: () => window.DorikForms?.init(),
        lazy: () => window.DorikLazy?.init()
      };

      const initFn = moduleMap[moduleName];
      if (initFn) {
        this.mark(`init-${moduleName}-start`);
        await initFn();
        this.mark(`init-${moduleName}-end`);
        this.measure(`init-${moduleName}`, `init-${moduleName}-start`, `init-${moduleName}-end`);
        
        console.log(`⚙️ Module initialized: ${moduleName}`);
      }
    },

    // Setup global event handlers
    setupGlobalEventHandlers() {
      // Main click handler
      document.addEventListener('click', this.handleGlobalClick.bind(this));
      
      // Keyboard handlers
      document.addEventListener('keydown', this.handleKeydown.bind(this));
      
      console.log('👂 Global event handlers active');
    },

    // Handle global clicks
    handleGlobalClick(event) {
      const target = event.target;
      
      // Gallery triggers
      const isMainImage = target.hasAttribute('data-field') && target.getAttribute('data-field') === 'img_main';
      const isSeeMore = target.hasAttribute('data-field') && target.getAttribute('data-field') === 'see_more';
      
      // Order trigger
      const isOrderButton = target.hasAttribute('data-field') && target.getAttribute('data-field') === 'order';
      
      // Platform links
      const link = target.closest('a[href]');
      
      if (isMainImage || isSeeMore) {
        this.handleGalleryClick(event, target);
        return;
      }
      
      if (isOrderButton) {
        this.handleOrderClick(event, target);
        return;
      }
      
      // Platform tracking
      if (link) {
        this.handlePlatformClick(event, link);
      }
    },

    // Handle gallery clicks
    async handleGalleryClick(event, target) {
      event.preventDefault();
      
      const containerId = window.DorikUtils?.findContainerId(target);
      if (!containerId) {
        console.error('❌ Container ID not found for gallery');
        return;
      }
      
      console.log('🖱️ Gallery clicked:', containerId);
      
      if (window.DorikGallery?.handleGalleryClick) {
        await window.DorikGallery.handleGalleryClick(target, containerId);
      } else {
        console.error('❌ Gallery module not available');
      }
    },

    // Handle order clicks
    async handleOrderClick(event, target) {
      event.preventDefault();
      
      const containerId = window.DorikUtils?.findContainerId(target);
      if (!containerId) {
        console.error('❌ Container ID not found for order');
        return;
      }
      
      console.log('🖱️ Order clicked:', containerId);
      
      if (window.DorikForms?.handleOrderClick) {
        await window.DorikForms.handleOrderClick(target, containerId);
      } else {
        console.error('❌ Forms module not available');
      }
    },

    // Handle platform clicks
    handlePlatformClick(event, link) {
      const containerId = window.DorikUtils?.findContainerId(link);
      if (!containerId) {
        return;
      }
      
      if (window.DorikTracking?.handlePlatformClick) {
        window.DorikTracking.handlePlatformClick(link, containerId);
      }
    },

    // Handle keyboard events
    handleKeydown(event) {
      // ESC key - close gallery
      if (event.key === 'Escape') {
        if (window.DorikGallery?.closeGallery) {
          window.DorikGallery.closeGallery();
        }
      }
    },

    // Setup cleanup handlers
    setupCleanupHandlers() {
      window.addEventListener('beforeunload', () => {
        console.log('🧹 Performing system cleanup...');
        
        // Cleanup modules
        window.DorikCache?.cleanup();
        window.DorikTracking?.cleanup();
        window.DorikForms?.cleanup();
        window.DorikGallery?.cleanup();
        window.DorikLazy?.cleanup();
        window.DorikFirebase?.cleanup();
        
        // Clear global state
        if (window.DorikState) {
          if (window.DorikState.timers.cleanup) {
            clearInterval(window.DorikState.timers.cleanup);
          }
          if (window.DorikState.timers.performance) {
            clearInterval(window.DorikState.timers.performance);
          }
        }
      });
    },

    // Setup performance monitoring
    setupPerformanceMonitoring() {
      const config = window.DorikConfig;
      if (!config?.DEBUG) return;

      // Performance report every 5 minutes
      const performanceTimer = setInterval(() => {
        this.reportPerformance();
      }, 300000);
      
      // Store timer reference
      if (window.DorikState) {
        window.DorikState.timers.performance = performanceTimer;
      }

      // Initial performance report after 10 seconds
      setTimeout(() => {
        this.reportPerformance();
        
        // Track performance metrics
        if (window.DorikTracking?.trackPerformance) {
          window.DorikTracking.trackPerformance();
        }
        
        // Track cache performance
        if (window.DorikTracking?.trackCachePerformance) {
          window.DorikTracking.trackCachePerformance();
        }
      }, 10000);
    },

    // Report performance metrics
    reportPerformance() {
      const memoryInfo = window.DorikUtils?.getMemoryInfo();
      if (memoryInfo) {
        console.log('📊 === PERFORMANCE REPORT ===');
        console.log(`Memory: ${memoryInfo.used_mb}MB / ${memoryInfo.total_mb}MB / ${memoryInfo.limit_mb}MB`);
      }
      
      // Cache stats
      if (window.DorikCache?.getStats) {
        const cacheStats = window.DorikCache.getStats();
        if (cacheStats.productCache && cacheStats.imageCache) {
          console.table([cacheStats.productCache, cacheStats.imageCache]);
        }
      }
      
      // Module stats
      const moduleStats = {
        config: !!window.DorikConfig,
        cache: window.DorikCache?.getStats() || null,
        firebase: window.DorikFirebase?.getStats() || null,
        tracking: window.DorikTracking?.getStats() || null,
        gallery: window.DorikGallery?.getStats() || null,
        forms: window.DorikForms?.getStats() || null,
        lazy: window.DorikLazy?.getStats() || null
      };
      
      console.log('Module Status:', moduleStats);
      
      // Global counters
      if (window.DorikState?.counters) {
        console.log('Global Counters:', window.DorikState.counters);
      }
    },

    // Performance helpers
    mark(name) {
      if (performance.mark) {
        performance.mark(name);
      }
    },

    measure(name, start, end) {
      if (performance.measure) {
        performance.measure(name, start, end);
        
        const measures = performance.getEntriesByName(name);
        if (measures.length > 0 && window.DorikConfig?.DEBUG) {
          console.log(`⏱️ ${name}: ${measures[0].duration.toFixed(2)}ms`);
        }
      }
    },

    // Fire ready event
    fireReadyEvent() {
      const event = new CustomEvent('dorik:ready', {
        detail: {
          loadedModules: Array.from(this.loadedModules),
          timestamp: Date.now(),
          version: '2.0'
        }
      });
      
      document.dispatchEvent(event);
      
      // Also set global flag
      window.DORIK_READY = true;
      
      // Store global access
      window.DorikSystem = {
        loader: this,
        config: window.DorikConfig,
        utils: window.DorikUtils,
        state: window.DorikState,
        cache: window.DorikCache,
        firebase: window.DorikFirebase,
        tracking: window.DorikTracking,
        gallery: window.DorikGallery,
        forms: window.DorikForms,
        lazy: window.DorikLazy
      };
    },

    // Get system status
    getStatus() {
      return {
        loaded: this.loadedModules.size > 0,
        modules: Array.from(this.loadedModules),
        ready: !!window.DORIK_READY,
        version: '2.0',
        stats: {
          cache: window.DorikCache?.getStats?.() || null,
          firebase: window.DorikFirebase?.getStats?.() || null,
          tracking: window.DorikTracking?.getStats?.() || null,
          gallery: window.DorikGallery?.getStats?.() || null,
          forms: window.DorikForms?.getStats?.() || null,
          lazy: window.DorikLazy?.getStats?.() || null
        },
        state: window.DorikState || null
      };
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.DorikLoader.init();
    });
  } else {
    // DOM already ready
    window.DorikLoader.init();
  }

  console.log('📋 Dorik Loader ready - modular system');

})();
