// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ***************************************************************
// - [#] indicates a test step (e.g. # Go to a page)
// - [*] indicates an assertion (e.g. * Check the title)
// ***************************************************************
import {stubClipboard} from '../../utils';

describe('playbooks > overview', () => {
    let testTeam;
    let testUser;
    let testPublicPlaybook;
    let testPrivateOnlyMinePlaybook;
    let testPrivateSharedPlaybook;

    before(() => {
        cy.apiInitSetup().then(({team, user}) => {
            testTeam = team;
            testUser = user;

            // # Create another user
            cy.apiCreateUser().then(({user: anotherUser}) => {
                // # Login as testUser
                cy.apiLogin(testUser);

                // # Create a public playbook
                cy.apiCreatePlaybook({
                    teamId: testTeam.id,
                    title: 'Public Playbook',
                    memberIDs: [],
                }).then((playbook) => {
                    testPublicPlaybook = playbook;
                });

                // # Create a private playbook with only the current user
                cy.apiCreatePlaybook({
                    teamId: testTeam.id,
                    title: 'Private Only Mine Playbook',
                    memberIDs: [testUser.id],
                }).then((playbook) => {
                    testPrivateOnlyMinePlaybook = playbook;
                });

                // # Create a private playbook with multiple users
                cy.apiCreatePlaybook({
                    teamId: testTeam.id,
                    title: 'Private Shared Playbook',
                    memberIDs: [testUser.id, anotherUser.id],
                }).then((playbook) => {
                    testPrivateSharedPlaybook = playbook;
                });
            });
        });
    });

    beforeEach(() => {
        // # Size the viewport to show the RHS without covering posts.
        cy.viewport('macbook-13');

        // # Login as testUser
        cy.apiLogin(testUser);
    });

    it('redirects to not found error if the playbook is unknown', () => {
        // # Visit the URL of a non-existing playbook
        cy.visit('/playbooks/playbooks/an_unknown_id');

        // * Verify that the user has been redirected to the playbooks not found error page
        cy.url().should('include', '/playbooks/error?type=playbooks');
    });

    describe('permissions text', () => {
        it('should describe public playbooks', () => {
            // # Navigate directly to the playbook
            cy.visit(`/playbooks/playbooks/${testPublicPlaybook.id}`);

            // # Verify permissions icon
            cy.findByTestId('playbookPermissionsDescription').within(() => {
                cy.get('.icon-globe').should('be.visible');
            });

            // # Verify permissions text
            cy.findByTestId('playbookPermissionsDescription')
                .contains(`Everyone in ${testTeam.display_name} can access this playbook`);
        });

        it('should describe playbooks private only to the current user', () => {
            // # Navigate directly to the playbook
            cy.visit(`/playbooks/playbooks/${testPrivateOnlyMinePlaybook.id}`);

            // # Verify permissions icon
            cy.findByTestId('playbookPermissionsDescription').within(() => {
                cy.get('.icon-lock-outline').should('be.visible');
            });

            // # Verify permissions text
            cy.findByTestId('playbookPermissionsDescription')
                .contains('Only you can access this playbook');
        });

        it('should describe playbooks private to multiple users', () => {
            // # Navigate directly to the playbook
            cy.visit(`/playbooks/playbooks/${testPrivateSharedPlaybook.id}`);

            // # Verify permissions icon
            cy.findByTestId('playbookPermissionsDescription').within(() => {
                cy.get('.icon-lock-outline').should('be.visible');
            });

            // # Verify permissions text
            cy.findByTestId('playbookPermissionsDescription')
                .contains('2 people can access this playbook');
        });
    });

    it('should switch to channels and prompt to run when clicking run', () => {
        // # Navigate directly to the playbook
        cy.visit(`/playbooks/playbooks/${testPublicPlaybook.id}`);

        // # Click Run Playbook
        cy.findByTestId('run-playbook').click({force: true});

        // * Verify the playbook run creation dialog has opened
        cy.get('#interactiveDialogModal').should('exist').within(() => {
            cy.findByText('Start run').should('exist');
        });
    });

    it('should copy playbook link', () => {
        // # Navigate directly to the playbook
        cy.visit(`/playbooks/playbooks/${testPublicPlaybook.id}`);

        // # trigger the tooltip
        cy.get('.icon-link-variant').trigger('mouseover');

        // * Verify tooltip text
        cy.get('#copy-playbook-link-tooltip').should('contain', 'Copy link to playbook');

        stubClipboard().as('clipboard');

        // # click on copy button
        cy.get('.icon-link-variant').click().then(() => {
            // * Verify that tooltip text changed
            cy.get('#copy-playbook-link-tooltip').should('contain', 'Copied!');

            // * Verify clipboard content
            cy.get('@clipboard').its('contents').should('contain', `/playbooks/playbooks/${testPublicPlaybook.id}`);
        });
    });

    describe('archiving', () => {
        const playbookTitle = 'Playbook (' + Date.now() + ')';
        let testPlaybook;

        before(() => {
            cy.apiCreateTestPlaybook({
                teamId: testTeam.id,
                title: playbookTitle,
                userId: testUser.id,
            }).then((playbook) => {
                testPlaybook = playbook;
            });
        });

        it('shows intended UI and disallows further updates', () => {
            // # Programmatically archive it
            cy.apiArchivePlaybook(testPlaybook.id);

            // # Visit the selected playbook
            cy.visit(`/playbooks/playbooks/${testPlaybook.id}`);

            // * Verify we're on the right playbook
            cy.get('[class^="Title-"]').contains(playbookTitle);

            // * Verify we can see the archived badge
            cy.findByTestId('archived-badge').should('be.visible');

            // * Verify the run button is disabled
            cy.findByTestId('run-playbook').should('be.disabled');

            // * Verify the edit button is disabled
            cy.findByTestId('edit-playbook').should('be.disabled');

            // # Attempt to edit the playbook
            cy.apiGetPlaybook(testPlaybook.id).then((playbook) => {
                // # New title
                playbook.title = 'new Title!!!';

                // * Verify update fails
                cy.apiUpdatePlaybook(playbook, 400);
            });
        });
    });
});
