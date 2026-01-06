import 'reflect-metadata';
import { injectable } from 'inversify';
import React from 'react';
import { renderToString } from 'react-dom/server';

/**
 * Service for rendering React TSX components to HTML strings
 * Used for email template generation
 */
@injectable()
export class TemplateRendererService {
  /**
   * Render a React component to HTML string
   * @param component React component to render
   * @param props Props to pass to the component
   * @returns HTML string ready for email clients
   */
  renderTemplate<T extends Record<string, unknown> = Record<string, unknown>>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: React.ComponentType<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: T | any
  ): string {
    try {
      const element = React.createElement(component, props);
      const html = renderToString(element);
      return `<!DOCTYPE html>${html}`;
    } catch (error) {
      console.error('Error rendering email template:', error);
      throw new Error(`Failed to render email template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Render JSX element to HTML string
   * @param element React element to render
   * @returns HTML string ready for email clients
   */
  renderToHtml(element: React.ReactElement): string {
    try {
      const html = renderToString(element);
      return `<!DOCTYPE html>${html}`;
    } catch (error) {
      console.error('Error rendering email template:', error);
      throw new Error(`Failed to render email template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

