// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import styled from 'styled-components';
import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {Switch, Route, Redirect, NavLink, useRouteMatch, useLocation} from 'react-router-dom';

import Icon from '@mdi/react';
import {mdiClipboardPlayOutline} from '@mdi/js';

import {getTeam} from 'mattermost-redux/selectors/entities/teams';
import {Team} from 'mattermost-redux/types/teams';
import {GlobalState} from 'mattermost-redux/types/store';

import {navigateToUrl, navigateToPluginUrl, pluginErrorUrl} from 'src/browser_routing';
import {useExperimentalFeaturesEnabled, useForceDocumentTitle} from 'src/hooks';
import PlaybookUsage from 'src/components/backstage/playbooks/playbook_usage';

import {SecondaryButtonLargerRight} from 'src/components/backstage/playbook_runs/shared';
import {clientFetchPlaybook, telemetryEventForPlaybook} from 'src/client';
import {ErrorPageTypes} from 'src/constants';
import {PlaybookWithChecklist} from 'src/types/playbook';
import {startPlaybookRunById} from 'src/actions';
import {PrimaryButton} from 'src/components/assets/buttons';
import ClipboardsPlay from 'src/components/assets/icons/clipboards_play';
import {RegularHeading} from 'src/styles/headings';

interface MatchParams {
    playbookId: string
}

const FetchingStateType = {
    loading: 'loading',
    fetched: 'fetched',
    notFound: 'notfound',
};

const Playbook = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const match = useRouteMatch<MatchParams>();
    const experimentalFeaturesEnabled = useExperimentalFeaturesEnabled();
    const [playbook, setPlaybook] = useState<PlaybookWithChecklist | null>(null);
    const [fetchingState, setFetchingState] = useState(FetchingStateType.loading);
    const team = useSelector<GlobalState, Team>((state) => getTeam(state, playbook?.team_id || ''));

    useForceDocumentTitle(playbook?.title ? (playbook.title + ' - Playbooks') : 'Playbooks');

    const activeNavItemStyle = {
        color: 'var(--button-bg)',
        boxShadow: 'inset 0px -2px 0px 0px var(--button-bg)',
    };

    const goToPlaybooks = () => {
        navigateToPluginUrl('/playbooks');
    };

    const goToEdit = () => {
        navigateToUrl(location.pathname + '/edit');
    };

    const runPlaybook = () => {
        if (playbook?.id) {
            telemetryEventForPlaybook(playbook.id, 'playbook_dashboard_run_clicked');
            navigateToUrl(`/${team.name || ''}/_playbooks/${playbook?.id || ''}/run`);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            const playbookId = match.params.playbookId;
            if (playbookId) {
                try {
                    const fetchedPlaybook = await clientFetchPlaybook(playbookId);
                    setPlaybook(fetchedPlaybook!);
                    setFetchingState(FetchingStateType.fetched);
                } catch {
                    setFetchingState(FetchingStateType.notFound);
                }
            }
        };

        fetchData();
    }, [match.params.playbookId]);

    if (fetchingState === FetchingStateType.loading) {
        return null;
    }

    if (fetchingState === FetchingStateType.notFound || playbook === null) {
        return <Redirect to={pluginErrorUrl(ErrorPageTypes.PLAYBOOKS)}/>;
    }

    let subTitle;
    let accessIconClass;
    if (playbook.member_ids.length === 1) {
        subTitle = 'Only you can access this playbook';
        accessIconClass = 'icon-lock-outline';
    } else if (playbook.member_ids.length > 1) {
        subTitle = `${playbook.member_ids.length} people can access this playbook`;
        accessIconClass = 'icon-lock-outline';
    } else if (team) {
        accessIconClass = 'icon-globe';
        subTitle = `Everyone in ${team.name} can access this playbook`;
    } else {
        accessIconClass = 'icon-globe';
        subTitle = 'Everyone in this team can access this playbook';
    }

    const enableRunPlaybook = playbook?.delete_at === 0;

    return (
        <>
            <TopContainer>
                <TitleRow>
                    <LeftArrow
                        className='icon-arrow-left'
                        onClick={goToPlaybooks}
                    />
                    <VerticalBlock>
                        <Title>{playbook.title}</Title>
                        <HorizontalBlock data-testid='playbookPermissionsDescription'>
                            <i className={'icon ' + accessIconClass}/>
                            <SubTitle>{subTitle}</SubTitle>
                        </HorizontalBlock>
                    </VerticalBlock>
                    <SecondaryButtonLargerRight onClick={goToEdit}>
                        <i className={'icon icon-pencil-outline'}/>
                        {'Edit'}
                    </SecondaryButtonLargerRight>
                    <PrimaryButtonLarger
                        onClick={runPlaybook}
                        disabled={!enableRunPlaybook}
                        data-testid='run-playbook'
                    >
                        <RightMarginedIcon
                            path={mdiClipboardPlayOutline}
                            size={1.25}
                        />
                        {'Run'}
                    </PrimaryButtonLarger>
                </TitleRow>
            </TopContainer>
            {(!experimentalFeaturesEnabled && <PlaybookUsage playbook={playbook}/>) ||
                <>
                    <Navbar>
                        <NavItem
                            activeStyle={activeNavItemStyle}
                            to={`${match.url}/preview`}
                        >
                            {'Preview'}
                        </NavItem>
                        <NavItem
                            activeStyle={activeNavItemStyle}
                            to={`${match.url}/usage`}
                        >
                            {'Usage'}
                        </NavItem>
                    </Navbar>
                    <Switch>
                        <Route
                            exact={true}
                            path={`${match.path}`}
                        >
                            <Redirect to={`${match.url}/usage`}/>
                        </Route>
                        <Route path={`${match.path}/preview`}>
                            <h4>{'Site under construction'}</h4>
                        </Route>
                        <Route path={`${match.path}/usage`}>
                            <PlaybookUsage playbook={playbook}/>
                        </Route>
                    </Switch>
                </>
            }
        </>
    );
};

const TopContainer = styled.div`
    position: sticky;
    z-index: 2;
    top: 0;
    background: var(--center-channel-bg);
    width: 100%;
    box-shadow: inset 0px -1px 0px var(--center-channel-color-16);
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    margin: 0 32px;
    height: 82px;
`;

const LeftArrow = styled.button`
    display: block;
    padding: 0;
    border: none;
    background: transparent;
    font-size: 24px;
    line-height: 24px;
    cursor: pointer;
    color: var(--center-channel-color-56);

    &:hover {
        background: var(--button-bg-08);
        color: var(--button-bg);
    }
`;

const VerticalBlock = styled.div`
    display: flex;
    flex-direction: column;
    font-weight: 400;
    padding: 0 16px 0 24px;
`;

const HorizontalBlock = styled.div`
    display: flex;
    flex-direction: row;
    color: var(--center-channel-color-64);

    > i {
        font-size: 12px;
        margin-left: -3px;
    }
`;

const Title = styled.div`
    ${RegularHeading}

    font-size: 20px;
    line-height: 28px;
    color: var(--center-channel-color);
`;

const SubTitle = styled.div`
    font-size: 11px;
    line-height: 16px;
`;

const ClipboardsPlaySmall = styled(ClipboardsPlay)`
    height: 18px;
    width: auto;
    margin-right: 7px;
    color: var(--button-color);
`;

const PrimaryButtonLarger = styled(PrimaryButton)`
    padding: 0 16px;
    height: 36px;
    margin-left: 12px;
`;
const Navbar = styled.nav`
    background: var(--center-channel-bg);
    height: 55px;
    width: 100%;
    box-shadow: inset 0px -1px 0px 0px rgba(var(--center-channel-color-rgb), 0.16);

    display: flex;
    flex-direction: row;
    padding-left: 80px;
    margin: 0;
`;

const NavItem = styled(NavLink)`
    display: flex;
    align-items: center;
    text-align: center;
    padding: 0 25px;
    font-weight: 600;

    && {
        color: rgba(var(--center-channel-color-rgb), 0.64);

        :hover {
            color: var(--button-bg);
        }

       :hover, :focus {
            text-decoration: none;
        }
    }
`;

const RightMarginedIcon = styled(Icon)`
    margin-right: 0.5rem;
`;

export default Playbook;