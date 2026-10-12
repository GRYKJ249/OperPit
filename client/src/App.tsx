import { Route, Router, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { SiteShell } from "./components/site/SiteShell";
import { MetaUpdater } from "./components/site/MetaUpdater";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { workCategories } from "./data/portfolio";
import Home from "./pages/Home";
import InfoPage from "./pages/InfoPage";
import ServicesPage from "./pages/Services";
import WorkPage from "./pages/Work";
import ProjectDetail from "./pages/ProjectDetail";
import JournalPage from "./pages/Journal";
import ArticleDetail from "./pages/ArticleDetail";
import TestimonialsPage from "./pages/Testimonials";
import FAQPage from "./pages/FAQ";
import ContactPage from "./pages/Contact";
import NotFound from "./pages/NotFound";
import { DailyArchivePage, DailyPostPage } from "./features/daily/DailyPages";
import { AIStudioPage } from "./features/assistant/AIStudio";
import { GitHubIndexPage, GitHubRepoPage } from "./features/github/GitHubPages";
import { GitLabIndexPage, GitLabProjectPage } from "./features/gitlab/GitLabPages";
import CouncilRoom from "./features/council/CouncilRoom";
import { ManagedGitIndexPage, ManagedGitProjectPage } from "./features/managed-git/ManagedGitPages";

export default function App({ ssrPath }: { ssrPath?: string }) {
  return <ErrorBoundary>
    <ThemeProvider defaultTheme="light" switchable>
      <LanguageProvider>
        <Router ssrPath={ssrPath}>
          <MetaUpdater />
          <SiteShell>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/about" component={InfoPage} />
              <Route path="/journey" component={InfoPage} />
              <Route path="/approach" component={InfoPage} />
              <Route path="/skills" component={InfoPage} />
              <Route path="/toolkit" component={InfoPage} />
              <Route path="/process" component={InfoPage} />
              <Route path="/services" component={ServicesPage} />
              <Route path="/services/:slug" component={ServicesPage} />
              <Route path="/work" component={WorkPage} />
              {workCategories.map(category => <Route key={category.slug} path={`/work/${category.slug}`} component={WorkPage} />)}
              <Route path="/work/:slug" component={ProjectDetail} />
              <Route path="/journal" component={JournalPage} />
              <Route path="/journal/topics/:topic" component={JournalPage} />
              <Route path="/journal/:slug" component={ArticleDetail} />
              <Route path="/daily" component={DailyArchivePage} />
              <Route path="/daily/:slug" component={DailyPostPage} />
              <Route path="/github" component={GitHubIndexPage} />
              <Route path="/github/:owner/:repo" component={GitHubRepoPage} />
              <Route path="/gitlab" component={GitLabIndexPage} />
              <Route path="/gitlab/project/:id" component={GitLabProjectPage} />
              <Route path="/projects" component={ManagedGitIndexPage} />
              <Route path="/projects/:id" component={ManagedGitProjectPage} />
              <Route path="/ai-studio" component={AIStudioPage} />
              <Route path="/council" component={CouncilRoom} />
              <Route path="/testimonials" component={TestimonialsPage} />
              <Route path="/faq" component={FAQPage} />
              <Route path="/contact" component={ContactPage} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </SiteShell>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>;
}
