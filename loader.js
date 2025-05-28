/**
 * LOADER.JS - Module Loader & Main Initialization
 * Orchestrates loading và initialization của tất cả modules
 */

(function() {
  'use strict';

  // === DORIK SYSTEM LOADER ===
  window.DorikLoader = {
    
    loadedModules: new Set(),
    initializationPromise: null,
    
    // CDN base URL (có thể override)
    cdnBase: 'https://raw.githubusercontent.com/locpham1020/dorik-modules/main/',
    
    // Module configuration
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
        required: true,
        priority: 4,
        depends: ['config']
      },
      gallery: {
        file: 'gallery.min.js',
        required: false,
        priority: 5,
        depends: ['config', 'cache', 'firebase', 'tracking']
      },
      forms: {
        file: 'forms.min.js',
        required: false,
        priority: 6,
        depends: ['config', 'tracking']
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
        console.log('🚀 === DORIK UNIFIED SYSTEM v2.0 ===');
        
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

        // Setup lazy loading system
        this.setupLazyLoading();

        // Setup cleanup handlers
        this.setupCleanup();

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
          console.error(`Failed to load module ${name}:`, error);
          
          if (config.required) {
            throw new Error(`Required module ${name} failed to load: ${error.message}`);
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
      const initOrder = ['config', 'cache', 'firebase', 'tracking', 'gallery', 'forms'];
      
      for (const moduleName of initOrder) {
        if (!this.loadedModules.has(moduleName)) {
          continue;
        }
        
        try {
          await this.initializeModule(moduleName);
        } catch (error) {
          console.error(`Module ${moduleName} initialization failed:`, error);
          
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
          if (!window.DorikConfig || !window.DorikUtils) {
            throw new Error('Config module not properly loaded');
          }
        },
        cache: () => window.DorikCache?.init(),
        firebase: () => window.DorikFirebase?.init(),
        tracking: () => window.DorikTracking?.init(),
        gallery: () => window.DorikGallery?.init(),
        forms: () => window.DorikForms?.init()
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

    // Setup lazy loading system
    setupLazyLoading() {
      const config = window.DorikConfig;
      if (!config) return;

      // Create intersection observer for lazy loading
      const observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: config.VIEWPORT_MARGIN,
          threshold: 0.1
        }
      );

      // Observe all product containers
      const containers = document.querySelectorAll('[id^="container-"]');
      containers.forEach(container => observer.observe(container));

      // Store observer reference
      if (window.DorikState) {
        window.DorikState.observers.intersection = observer;
      }

      console.log(`👁️ Lazy loading setup for ${containers.length} containers`);
    },

    // Handle intersection (lazy loading)
    async handleIntersection(entries) {
      const config = window.DorikConfig;
      const containersToLoad = [];

      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const containerId = entry.target.id;
          
          // Skip if already processed
          if (window.DorikState?.processedContainers.has(containerId)) {
            return;
          }

          containersToLoad.push({
            id: containerId,
            element: entry.target,
            distance: this.getDistanceFromViewport(entry.target)
          });
        }
      });

      if (containersToLoad.length === 0) {
        return;
      }

      // Sort by distance from viewport
      containersToLoad.sort((a, b) => a.distance - b.distance);

      // Process in batches
      const batchSize = config?.BATCH_SIZE || 30;
      for (let i = 0; i < containersToLoad.length; i += batchSize) {
        const batch = containersToLoad.slice(i, i + batchSize);
        await this.processBatch(batch);
      }
    },

    // Process batch of containers
    async processBatch(containers) {
      const containerIds = containers.map(c => c.id);
      
      try {
        // Fetch product data
        if (window.DorikFirebase?.preloadProducts) {
          await window.DorikFirebase.preloadProducts(containerIds, 'high');
        }

        // Mark as processed
        if (window.DorikState) {
          containerIds.forEach(id => {
            window.DorikState.processedContainers.add(id);
          });
        }

        console.log(`📦 Processed batch: ${containerIds.length} containers`);

      } catch (error) {
        console.error('Batch processing error:', error);
      }
    },

    // Calculate distance from viewport
    getDistanceFromViewport(element) {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      if (rect.top >= 0 && rect.top <= viewportHeight) {
        return 0; // In viewport
      } else if (rect.top > viewportHeight) {
        return rect.top - viewportHeight; // Below viewport
      } else {
        return Math.abs(rect.bottom); // Above viewport
      }
    },

    // Setup cleanup handlers
    setupCleanup() {
      window.addEventListener('beforeunload', () => {
        console.log('🧹 Performing cleanup...');
        
        // Cleanup modules
        window.DorikCache?.clear();
        window.DorikTracking?.cleanup();
        window.DorikForms?.cleanup();
        
        // Clear observers
        if (window.DorikState?.observers.intersection) {
          window.DorikState.observers.intersection.disconnect();
        }
      });
    },

    // Setup performance monitoring
    setupPerformanceMonitoring() {
      const config = window.DorikConfig;
      if (!config?.DEBUG) return;

      // Monitor performance every 5 minutes
      setInterval(() => {
        this.reportPerformance();
      }, 300000);

      // Initial performance report
      setTimeout(() => {
        this.reportPerformance();
        
        // Track cache performance if available
        if (window.DorikTracking?.trackCachePerformance) {
          window.DorikTracking.trackCachePerformance();
        }
      }, 10000);
    },

    // Report performance metrics
    reportPerformance() {
      if (!performance.memory) return;

      const memory = performance.memory;
      const memoryMB = {
        used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(1),
        total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(1),
        limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)
      };

      console.log('📊 Performance Report:');
      console.log(`Memory: ${memoryMB.used}MB / ${memoryMB.total}MB / ${memoryMB.limit}MB`);
      
      if (window.DorikCache) {
        console.table([
          window.DorikCache.productCache?.getStats(),
          window.DorikCache.imageCache?.getStats()
        ]);
      }
      
      if (window.DorikState) {
        console.log('Counters:', window.DorikState.counters);
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
          timestamp: Date.now()
        }
      });
      
      document.dispatchEvent(event);
      
      // Also set global flag
      window.DORIK_READY = true;
    },

    // Get system status
    getStatus() {
      return {
        loaded: this.loadedModules.size > 0,
        modules: Array.from(this.loadedModules),
        cache: window.DorikCache?.getStats?.() || null,
        gallery: window.DorikGallery?.getStats?.() || null,
        forms: window.DorikForms?.getStats?.() || null,
        tracking: window.DorikTracking?.getStats?.() || null,
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

  console.log('📋 Dorik Loader ready');

})();
