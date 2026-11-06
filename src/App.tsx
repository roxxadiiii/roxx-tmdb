import { useMemo, useState } from "react";

type Movie = {
  id: number;
  title: string;
  year: number;
  genres: string[];
  rating: string;
  overview: string;
  keywords: string[];
  art: string;
  artLabel: string;
};

const movies: Movie[] = [
  {
    id: 1,
    title: "Arrival",
    year: 2016,
    genres: ["Science Fiction", "Drama", "Mystery"],
    rating: "7.6",
    overview:
      "A linguist is recruited to communicate with mysterious visitors and discovers that understanding their language could change how we see time.",
    keywords: ["aliens", "first contact", "language", "time"],
    art: "arrival",
    artLabel: "A pale moon above a misty mountain",
  },
  {
    id: 2,
    title: "Interstellar",
    year: 2014,
    genres: ["Science Fiction", "Adventure", "Drama"],
    rating: "8.4",
    overview:
      "A team travels beyond this galaxy to discover whether mankind has a future among the stars.",
    keywords: ["space", "exploration", "future", "family"],
    art: "interstellar",
    artLabel: "A lone explorer beneath a distant planet",
  },
  {
    id: 3,
    title: "The Grand Budapest Hotel",
    year: 2014,
    genres: ["Comedy", "Adventure", "Drama"],
    rating: "8.0",
    overview:
      "A legendary concierge and his young protégé become tangled in a story of art, inheritance, and a changing Europe.",
    keywords: ["hotel", "friendship", "heist", "Europe"],
    art: "budapest",
    artLabel: "A bright hotel framed by distant mountains",
  },
  {
    id: 4,
    title: "Moonlight",
    year: 2016,
    genres: ["Drama"],
    rating: "7.4",
    overview:
      "A young man searches for connection and identity across three defining chapters of his life.",
    keywords: ["identity", "coming of age", "friendship", "family"],
    art: "moonlight",
    artLabel: "A deep blue shoreline beneath a full moon",
  },
  {
    id: 5,
    title: "Knives Out",
    year: 2019,
    genres: ["Mystery", "Comedy", "Crime"],
    rating: "7.8",
    overview:
      "A sharp detective unravels a wealthy family's tangled stories after the death of its celebrated patriarch.",
    keywords: ["detective", "murder", "family", "mansion"],
    art: "knives",
    artLabel: "A silhouette in a warmly lit manor",
  },
  {
    id: 6,
    title: "Her",
    year: 2013,
    genres: ["Romance", "Science Fiction", "Drama"],
    rating: "7.9",
    overview:
      "In a near-future city, a lonely writer forms an unexpected bond with an intelligent operating system.",
    keywords: ["artificial intelligence", "love", "future", "connection"],
    art: "her",
    artLabel: "A glowing sunset over a modern city",
  },
  {
    id: 7,
    title: "The Secret Life of Walter Mitty",
    year: 2013,
    genres: ["Adventure", "Comedy", "Drama"],
    rating: "7.2",
    overview:
      "A daydreaming photo editor sets out on a real-world adventure that takes him far beyond his routine.",
    keywords: ["journey", "self discovery", "adventure", "inspiration"],
    art: "walter",
    artLabel: "A tiny traveler looking across a mountain valley",
  },
  {
    id: 8,
    title: "The Martian",
    year: 2015,
    genres: ["Science Fiction", "Adventure", "Drama"],
    rating: "7.7",
    overview:
      "An astronaut stranded on Mars uses ingenuity and humor to survive while a rescue mission races against time.",
    keywords: ["Mars", "space", "survival", "science"],
    art: "martian",
    artLabel: "A small figure on a red desert planet",
  },
];

const relatedMovies: Record<number, number[]> = {
  1: [6, 2, 8, 4],
  2: [8, 1, 6, 7],
  3: [5, 7, 4],
  4: [6, 1, 7],
  5: [3, 1, 4],
  6: [1, 2, 4, 8],
  7: [3, 2, 4],
  8: [2, 1, 6],
};

const genres = [
  "Adventure",
  "Comedy",
  "Crime",
  "Drama",
  "Mystery",
  "Romance",
  "Science Fiction",
];

const suggestions = [
  { label: "Space exploration", query: "space exploration" },
  { label: "Mystery and family", query: "mystery family" },
  { label: "Coming of age", query: "coming of age" },
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M3.5 10h12m-5-5 5 5-5 5" />
    </svg>
  );
}

function FilmPoster({ movie }: { movie: Movie }) {
  return (
    <div className={`poster poster-${movie.art}`} role="img" aria-label={movie.artLabel}>
      <span className="poster-orbit" aria-hidden="true" />
      <span className="poster-title">{movie.title}</span>
      <span className="poster-year">{movie.year}</span>
    </div>
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<Movie | null>(null);
  const [sortOrder, setSortOrder] = useState("relevance");
  const [notice, setNotice] = useState("");

  const filteredMovies = useMemo(() => {
    const needle = activeQuery.trim().toLowerCase();
    const exactTitle = movies.find((movie) => movie.title.toLowerCase() === needle);

    let results = selectedSeed
      ? (relatedMovies[selectedSeed.id] ?? [])
          .map((id) => movies.find((movie) => movie.id === id))
          .filter((movie): movie is Movie => Boolean(movie))
      : exactTitle
        ? (relatedMovies[exactTitle.id] ?? [])
            .map((id) => movies.find((movie) => movie.id === id))
            .filter((movie): movie is Movie => Boolean(movie))
        : movies.filter((movie) => {
            if (!needle) return true;
            const searchable = [
              movie.title,
              movie.overview,
              ...movie.genres,
              ...movie.keywords,
              String(movie.year),
            ]
              .join(" ")
              .toLowerCase();
            const terms = needle.split(/\s+/).filter(Boolean);
            return terms.every((term) => searchable.includes(term));
          });

    if (selectedGenres.length > 0) {
      results = results.filter((movie) =>
        selectedGenres.some((genre) => movie.genres.includes(genre)),
      );
    }

    if (sortOrder === "rating") {
      results = [...results].sort((a, b) => Number(b.rating) - Number(a.rating));
    } else if (sortOrder === "newest") {
      results = [...results].sort((a, b) => b.year - a.year);
    }

    return results;
  }, [activeQuery, selectedGenres, selectedSeed, sortOrder]);

  const isExactTitle = movies.some(
    (movie) => movie.title.toLowerCase() === activeQuery.trim().toLowerCase(),
  );

  function runSearch(searchText = query) {
    setActiveQuery(searchText.trim());
    setSelectedSeed(null);
    setNotice("");
  }

  function chooseSeed(movie: Movie) {
    setSelectedSeed(movie);
    setQuery("");
    setActiveQuery("");
    setNotice("");
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((current) =>
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre],
    );
  }

  function resetDiscovery() {
    setQuery("");
    setActiveQuery("");
    setSelectedGenres([]);
    setSelectedSeed(null);
    setSortOrder("relevance");
    setNotice("");
  }

  function requestApiPreview() {
    setNotice("Live recommendations will be available when the movie API is connected.");
  }

  const resultsHeading = selectedSeed
    ? `Because you liked ${selectedSeed.title}`
    : isExactTitle
      ? `If you liked ${activeQuery}, try these`
      : activeQuery
        ? `Results for “${activeQuery}”`
        : "A few places to start";

  return (
    <>
      <header className="site-header">
        <a
          className="wordmark"
          href="#top"
          aria-label="Reelwise home"
          onClick={resetDiscovery}
        >
          <span className="wordmark-mark">R</span>
          <span>reelwise</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a className="nav-active" href="#discover">Discover</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About the project</a>
        </nav>
        <a className="header-link" href="#discover">
          START EXPLORING <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-inner page-width">
            <div className="hero-copy">
              <p className="eyebrow eyebrow-light">
                <span className="eyebrow-line" />
                MOVIE DISCOVERY, REIMAGINED
              </p>
              <h1 id="hero-title">Find your next<br />favorite film.</h1>
              <p className="hero-description">
                Tell us what you love, or describe the kind of story you’re in the mood for.
              </p>
              <form
                className="hero-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  runSearch();
                  document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <label className="visually-hidden" htmlFor="movie-search">
                  Search by movie, genre, or plot
                </label>
                <SearchIcon />
                <input
                  id="movie-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="A thoughtful sci-fi film about time…"
                />
                <button className="button-primary search-submit" type="submit">
                  DISCOVER <ArrowIcon />
                </button>
              </form>
              <div className="suggestion-row" aria-label="Try a search">
                <span>TRY</span>
                {suggestions.map((suggestion) => (
                  <button
                    className="suggestion"
                    key={suggestion.query}
                    onClick={() => {
                      setQuery(suggestion.query);
                      runSearch(suggestion.query);
                      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    type="button"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-art-glow" />
              <div className="hero-art-circle" />
              <div className="hero-poster hero-poster-back">
                <span>BEYOND<br />THE KNOWN</span>
                <i />
              </div>
              <div className="hero-poster hero-poster-front">
                <span>EVERY<br />STORY<br />LEADS<br />SOMEWHERE</span>
                <i />
              </div>
              <div className="hero-caption">
                <span>01 / 03</span>
                <span>Stories worth finding</span>
              </div>
            </div>
          </div>
          <div className="hero-bottom page-width">
            <span>FROM A TITLE TO A NEW FAVORITE</span>
            <span className="hero-scroll">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></span>
          </div>
        </section>

        <section className="discovery-section" id="discover" aria-labelledby="discover-title">
          <div className="page-width">
            <div className="section-intro">
              <div>
                <p className="eyebrow"><span className="eyebrow-line" />YOUR NEXT WATCH STARTS HERE</p>
                <h2 id="discover-title">Discover films</h2>
                <p className="section-description">
                  Search a title, a plot, a feeling—or bring them all together.
                </p>
              </div>
              <p className="preview-label">
                <span className="status-dot" />
                INTERACTIVE PREVIEW
              </p>
            </div>

            <div className="filter-area">
              <div className="filter-heading">
                <span className="filter-label">REFINE YOUR SEARCH</span>
                {(selectedGenres.length > 0 || selectedSeed || activeQuery) && (
                  <button className="clear-button" onClick={resetDiscovery} type="button">
                    CLEAR ALL
                  </button>
                )}
              </div>
              <div className="filter-controls">
                <div className="genre-filter" aria-label="Filter by genre">
                  {genres.map((genre) => (
                    <button
                      aria-pressed={selectedGenres.includes(genre)}
                      className={`filter-chip${selectedGenres.includes(genre) ? " selected" : ""}`}
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      type="button"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
                <label className="sort-control">
                  <span>SORT BY</span>
                  <select
                    aria-label="Sort movies"
                    onChange={(event) => setSortOrder(event.target.value)}
                    value={sortOrder}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="rating">Top rated</option>
                    <option value="newest">Newest</option>
                  </select>
                </label>
              </div>
              {selectedSeed && (
                <div className="seed-filter">
                  <span>SIMILAR TO</span>
                  <strong>{selectedSeed.title}</strong>
                  <button
                    aria-label={`Remove ${selectedSeed.title} as the selected movie`}
                    onClick={() => setSelectedSeed(null)}
                    type="button"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="results-heading" id="results">
              <div>
                <p className="eyebrow">CURATED FOR YOUR CURIOSITY</p>
                <h3>{resultsHeading}</h3>
              </div>
              <span className="result-count">
                {filteredMovies.length} {filteredMovies.length === 1 ? "FILM" : "FILMS"}
              </span>
            </div>

            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}

            {filteredMovies.length > 0 ? (
              <div className="movie-grid">
                {filteredMovies.map((movie, index) => (
                  <article className="movie-card" key={movie.id}>
                    <div className="movie-art-wrap">
                      <FilmPoster movie={movie} />
                      <span className="match-index">0{index + 1}</span>
                      <button
                        aria-label={`Show films similar to ${movie.title}`}
                        className="card-arrow"
                        onClick={() => chooseSeed(movie)}
                        type="button"
                      >
                        <ArrowIcon />
                      </button>
                    </div>
                    <div className="movie-info">
                      <div className="movie-title-line">
                        <h4>{movie.title}</h4>
                        <span className="movie-rating" aria-label={`Rating ${movie.rating} out of 10`}>
                          <span aria-hidden="true">★</span> {movie.rating}
                        </span>
                      </div>
                      <p className="movie-meta">
                        {movie.year}<span aria-hidden="true"> / </span>{movie.genres.slice(0, 2).join(" · ")}
                      </p>
                      <p className="movie-overview">{movie.overview}</p>
                      <button className="text-link" onClick={() => chooseSeed(movie)} type="button">
                        FIND SIMILAR <span aria-hidden="true">›</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-mark" aria-hidden="true">R</span>
                <h4>No films found this time.</h4>
                <p>Try a different title or plot description, or remove a genre filter.</p>
                <button className="button-secondary" onClick={resetDiscovery} type="button">
                  RESET DISCOVERY
                </button>
              </div>
            )}

            <div className="preview-note">
              <span className="note-icon" aria-hidden="true">i</span>
              <p>
                This is a front-end preview with a small sample catalog. Search and similar-film
                interactions demonstrate the planned experience; they are not generated by the
                machine-learning model yet.
              </p>
              <button onClick={requestApiPreview} type="button">ABOUT THE PREVIEW <span aria-hidden="true">↗</span></button>
            </div>
          </div>
        </section>

        <section className="how-section" id="how-it-works" aria-labelledby="how-title">
          <div className="page-width how-inner">
            <div>
              <p className="eyebrow eyebrow-light"><span className="eyebrow-line" />A LITTLE MORE THAN A SEARCH</p>
              <h2 id="how-title">From the feeling<br />to the film.</h2>
            </div>
            <div className="how-copy">
              <p>
                The goal is to blend plot understanding, genre signals, and the details that make a
                movie feel like itself—then show you why each recommendation made the list.
              </p>
              <button className="button-secondary-on-dark" onClick={requestApiPreview} type="button">
                EXPLORE THE APPROACH <ArrowIcon />
              </button>
              {notice && <span className="how-notice" role="status">{notice}</span>}
            </div>
            <div className="how-stat">
              <span>01</span>
              <p>Describe a story<br />or choose a title.</p>
            </div>
            <div className="how-stat">
              <span>02</span>
              <p>Refine by genre<br />and more.</p>
            </div>
            <div className="how-stat">
              <span>03</span>
              <p>Find your next<br />favorite film.</p>
            </div>
          </div>
        </section>

        <section className="closing-section" id="about">
          <div className="page-width closing-inner">
            <p className="eyebrow"><span className="eyebrow-line" />BUILT FOR THE LOVE OF A GOOD STORY</p>
            <h2>There’s always<br />another world to find.</h2>
            <a className="button-primary closing-cta" href="#discover">
              FIND A FILM <ArrowIcon />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-width footer-top">
          <a className="wordmark footer-wordmark" href="#top" onClick={resetDiscovery}>
            <span className="wordmark-mark">R</span>
            <span>reelwise</span>
          </a>
          <p>Better movie nights start with a good find.</p>
          <a href="#discover">BACK TO TOP ↑</a>
        </div>
        <div className="page-width footer-bottom">
          <span>© 2026 REELWISE · A MOVIE DISCOVERY PROJECT</span>
          <span>DATASET CREDIT: ASANICZKA / KAGGLE</span>
          <span>NOT AFFILIATED WITH TMDB</span>
        </div>
      </footer>
    </>
  );
}

export default App;
