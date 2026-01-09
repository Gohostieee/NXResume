"use client";

import { Book, EnvelopeSimple, GithubLogo, HandHeart } from "@phosphor-icons/react";
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DonateCard = () => (
  <Card className="space-y-3 bg-info text-info-foreground">
    <CardContent className="space-y-2">
      <CardTitle>Support the app by donating what you can!</CardTitle>
      <CardDescription className="text-info-foreground/90">
        This project is maintained by the community. Donations help keep it free and improving.
      </CardDescription>
    </CardContent>
    <CardFooter>
      <Button asChild size="sm" variant="secondary">
        <a
          href="https://opencollective.com/reactive-resume"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          <HandHeart className="mr-2 h-4 w-4" />
          Donate
        </a>
      </Button>
    </CardFooter>
  </Card>
);

const DocumentationCard = () => (
  <Card className="space-y-3">
    <CardContent className="space-y-2">
      <CardTitle>New here? Read the docs.</CardTitle>
      <CardDescription>
        Check out guides, examples, and tips to get the most out of the editor.
      </CardDescription>
    </CardContent>
    <CardFooter>
      <Button asChild size="sm" variant="outline">
        <a href="https://docs.rxresu.me/" target="_blank" rel="noopener noreferrer nofollow">
          <Book className="mr-2 h-4 w-4" />
          Documentation
        </a>
      </Button>
    </CardFooter>
  </Card>
);

const IssuesCard = () => (
  <Card className="space-y-3">
    <CardContent className="space-y-2">
      <CardTitle>Found a bug or have an idea?</CardTitle>
      <CardDescription>
        Share feedback or request features so we can improve the editor.
      </CardDescription>
    </CardContent>
    <CardFooter className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <a
          href="https://github.com/AmruthPillai/Reactive-Resume/issues/new/choose"
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          <GithubLogo className="mr-2 h-4 w-4" />
          Raise an issue
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a href="mailto:hello@amruthpillai.com">
          <EnvelopeSimple className="mr-2 h-4 w-4" />
          Email
        </a>
      </Button>
    </CardFooter>
  </Card>
);

export const InformationSection = () => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Information</h4>
      <div className="space-y-3">
        <DonateCard />
        <DocumentationCard />
        <IssuesCard />
      </div>
    </div>
  );
};
