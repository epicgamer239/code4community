"use client";
import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useLayoutEffect } from "react";
import DashboardTopBar from "../../components/DashboardTopBar";
import Footer from "../../components/Footer";

export default function Welcome() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  useLayoutEffect(() => {
    document.title = "Code4Community | Welcome";
  }, []);

  const handleMathLabClick = useCallback(() => {
    // Math Lab removed - no longer available
  }, []);

  const handleGradeCalculatorClick = useCallback(() => {
    router.push('/grade-calculator');
  }, [router]);

  const handleYearbookFormattingClick = useCallback(() => {
    router.push('/yearbook-formatting');
  }, [router]);

  // Apps data - memoized for performance
  const allApps = useMemo(() => [
    { 
      name: "Grade Calculator", 
      description: "Calculate your grades", 
      isActive: true,
      onClick: handleGradeCalculatorClick
    },
    { 
      name: "Yearbook Formatting", 
      description: "Format names for yearbook captions", 
      isActive: true,
      onClick: handleYearbookFormattingClick
    },
    { name: "Coming Soon", description: "More features coming soon", isActive: false },
    { name: "Coming Soon", description: "More features coming soon", isActive: false },
    { name: "Coming Soon", description: "More features coming soon", isActive: false },
    { name: "Coming Soon", description: "More features coming soon", isActive: false },
    { name: "Coming Soon", description: "More features coming soon", isActive: false },
    { name: "Coming Soon", description: "More features coming soon", isActive: false }
  ], [handleGradeCalculatorClick, handleYearbookFormattingClick]);

  // Filter apps based on search query - memoized for performance
  const filteredApps = useMemo(() => 
    allApps.filter(app => 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
    ), [allApps, searchQuery]
  );



  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Use the reusable DashboardTopBar component */}
      <DashboardTopBar 
        title="Code4Community" 
        showNavLinks={true}
      />

      {/* Header with Welcome and Available Apps */}
      <div className="px-6 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Welcome
            </h2>
            <p className="text-muted-foreground">
              Choose an app to get started
            </p>
          </div>
          
          {/* Centered Available Apps Title */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            <h3 className="text-2xl font-bold text-foreground mb-1">Available Apps</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery ? `Found ${filteredApps.length} app${filteredApps.length !== 1 ? 's' : ''}` : "Choose an app to get started"}
            </p>
            <div id="search-description" className="sr-only">
              Search through available applications by name or description
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="w-72">
            <div className="relative">
              <input
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2.5 pl-10 pr-10 text-sm text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200 placeholder:text-muted-foreground"
                aria-label="Search applications"
                aria-describedby="search-description"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-4">
        <div className="max-w-7xl mx-auto">

          {/* Apps Grid */}
          <div className="mb-8">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredApps.map((app, index) => (
                <div 
                  key={index} 
                  className={`group card-elevated relative h-[180px] flex flex-col items-center justify-center rounded-xl transition-all duration-300 hover:transform hover:scale-105 hover:shadow-lg ${
                    app.isActive 
                      ? 'opacity-100' 
                      : 'opacity-70 hover:opacity-90'
                  }`}
                  onClick={app.onClick}
                >
                  <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                    app.isActive 
                      ? 'bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/15 group-hover:to-primary/10' 
                      : 'bg-gradient-to-br from-muted/30 to-muted/10 group-hover:from-muted/40 group-hover:to-muted/20'
                  }`}></div>
                  <div className="relative z-10 text-center px-4">
                    <div className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                      app.isActive 
                        ? 'text-foreground group-hover:text-primary' 
                        : 'text-foreground group-hover:text-primary'
                    }`}>{app.name}</div>
                    <div className="text-sm text-muted-foreground leading-relaxed">{app.description}</div>
                  </div>
                  <div className={`absolute top-3 right-3 w-2 h-2 rounded-full transition-opacity duration-300 ${
                    app.isActive 
                      ? 'bg-primary opacity-60 group-hover:opacity-100' 
                      : 'bg-muted-foreground opacity-40 group-hover:opacity-60'
                  }`}></div>
                </div>
              ))}
            </div>

            {/* No results message */}
            {searchQuery && filteredApps.length === 0 && (
              <div className="text-center py-12">
                <div className="text-muted-foreground text-lg mb-2">No apps found</div>
                <div className="text-sm text-muted-foreground">Try searching with different keywords</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
