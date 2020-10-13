
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Switch, Route } from 'react-router-dom';
import Header from '../components/Header';
import Icon from '../components/Icon';
import DropdownField from '../components/Fields/DropdownField';
import TrackList from '../components/TrackList';
import ArtistGrid from '../components/ArtistGrid';
import AlbumGrid from '../components/AlbumGrid';
import PlaylistGrid from '../components/PlaylistGrid';
import LazyLoadListener from '../components/LazyLoadListener';
import SearchForm from '../components/Fields/SearchForm';
import URILink from '../components/URILink';
import SearchResults from '../components/SearchResults';
import * as coreActions from '../services/core/actions';
import * as uiActions from '../services/ui/actions';
import * as mopidyActions from '../services/mopidy/actions';
import * as spotifyActions from '../services/spotify/actions';
import { titleCase } from '../util/helpers';
import { i18n } from '../locale';

class Search extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      type: props.type || 'all',
      term: props.term || '',
    };
  }

  componentDidMount = () => {
    const {
      uiActions: {
        setWindowTitle,
      },
    } = this.props;

    setWindowTitle('Search');

    // Auto-focus on the input field
    $(document).find('.search-form input').focus();
    this.digestUri();
  }

  componentDidUpdate = ({
    type: prevType,
    term: prevTerm,
  }) => {
    const {
      type: typeProp,
      term: termProp,
    } = this.props;
    const { type, term } = this.state;

    if (prevType !== typeProp || prevTerm !== termProp) {
      this.search(type, term);
    }
  }

  onSubmit = (term) => {
    const { type } = this.state;
    const { history } = this.props;
    const encodedTerm = encodeURIComponent(term);

    this.setState(
      { term },
      () => {
        history.push(`/search/${type}/${encodedTerm}`);
      },
    );
  }

  onReset = () => {
    const { history } = this.props;
    history.push('/search');
  }

  onSortChange = (value) => {
    const { uiActions: { hideContextMenu } } = this.props;
    this.setSort(value);
    hideContextMenu();
  }

  onSourceChange = (value) => {
    const {
      uiActions: {
        set,
        hideContextMenu,
      },
    } = this.props;
    set({ uri_schemes_search_enabled: value });
    hideContextMenu();
  }

  onSourceClose = () => {
    this.search();
  };

  digestUri = () => {
    const {
      type,
      term,
    } = this.props;

    if (type && term) {
      this.setState({ type, term }, () => {
        this.search();
      });
    } else if (!term || term === '') {
      this.clearSearch();
    }
  }

  clearSearch = () => {
    const {
      uiActions: {
        setWindowTitle,
      },
    } = this.props;

    setWindowTitle(i18n('search.title'));
    this.setState({ term: '' });
  }

  search = () => {
    const {
      coreActions: {
        startSearch,
      },
      uiActions: {
        setWindowTitle,
      },
    } = this.props;
    const {
      type,
      term,
    } = this.state;

    setWindowTitle(i18n('search.title_window', { term: decodeURIComponent(term) }));

    /**
     * TODO: Searches are being triggered when navigating to type subviews, despite already having
     * results. This might be a consequence of having providers merging their results into one array
     */

    if (type && term) {
      startSearch({ type, term });
      /*
      mopidyActions.getSearchResults(type, term);

      if (uri_schemes_search_enabled.includes('spotify:')) {
        spotifyActions.getSearchResults(type, term);
      }*/
    }
  }

  loadMore = (type) => {
    alert(`load more: ${type}`);
    // this.props.spotifyActions.getURL(this.props['spotify_'+type+'_more'], 'SPOTIFY_SEARCH_RESULTS_LOADED_MORE_'+type.toUpperCase());
  }

  setSort = (value) => {
    const {
      sort,
      sort_reverse,
      uiActions: {
        set,
      },
    } = this.props;

    let reverse = false;
    if (sort === value) reverse = !sort_reverse;

    const data = {
      search_results_sort_reverse: reverse,
      search_results_sort: value,
    };
    set(data);
  }

  render = () => {
    const {
      term,
      type,
    } = this.state;
    const {
      uri_schemes,
      sort,
      sort_reverse,
      history,
      uri_schemes_search_enabled,
      uiActions,
    } = this.props;

    const sort_options = [
      { value: 'followers', label: i18n('common.popularity') },
      { value: 'name', label: i18n('common.name') },
      { value: 'artists.name', label: i18n('common.artist') },
      { value: 'duration', label: i18n('common.duration') },
      { value: 'uri', label: i18n('common.source') },
    ];

    const provider_options = uri_schemes.map((item) => ({
      value: item,
      label: titleCase(item.replace(':', '').replace('+', ' ')),
    }));

    const options = (
      <span>
        <DropdownField
          icon="swap_vert"
          name={i18n('common.sort')}
          value={sort}
          valueAsLabel
          options={sort_options}
          selected_icon={sort_reverse ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
          handleChange={this.onSortChange}
        />
        <DropdownField
          icon="cloud"
          name={i18n('common.sources')}
          value={uri_schemes_search_enabled}
          options={provider_options}
          handleChange={this.onSourceChange}
          onClose={this.onSourceClose}
        />
      </span>
    );

    return (
      <div className="view search-view">
        <Header options={options} uiActions={uiActions}>
          <Icon name="search" type="material" />
        </Header>

        <SearchForm
          key={`search_form_${type}_${term}`}
          history={history}
          term={term}
          onSubmit={this.onSubmit}
          onReset={this.onReset}
        />

        <div className="content-wrapper">
          <Switch>

            <Route path="/search/artists/:term">
              <SearchResults type="artists" query={{ term, type }} />
            </Route>

            <Route path="/search/albums/:term">
              <SearchResults type="albums" query={{ term, type }} />
            </Route>

            <Route path="/search/playlists/:term">
              <SearchResults type="playlists" query={{ term, type }} />
            </Route>

            <Route path="/search/tracks/:term">
              <SearchResults type="tracks" query={{ term, type }} />
            </Route>

            <Route path="/search">
              <div className="search-result-sections cf">
                <section className="search-result-sections__item">
                  <div className="inner">
                    <SearchResults type="artists" query={{ term, type }} all />
                  </div>
                </section>
                <section className="search-result-sections__item">
                  <div className="inner">
                    <SearchResults type="albums" query={{ term, type }} all />
                  </div>
                </section>
                <section className="search-result-sections__item">
                  <div className="inner">
                    <SearchResults type="playlists" query={{ term, type }} all />
                  </div>
                </section>
              </div>
              <SearchResults type="tracks" query={{ term, type }} all />
            </Route>

          </Switch>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => ({
  type: ownProps.match.params.type,
  term: ownProps.match.params.term,
  uri_schemes_search_enabled: state.ui.uri_schemes_search_enabled || [],
  uri_schemes: state.mopidy.uri_schemes || [],
  sort: state.ui.search_results_sort || 'followers.total',
  sort_reverse: (!!state.ui.search_results_sort_reverse),
});

const mapDispatchToProps = (dispatch) => ({
  coreActions: bindActionCreators(coreActions, dispatch),
  uiActions: bindActionCreators(uiActions, dispatch),
  mopidyActions: bindActionCreators(mopidyActions, dispatch),
  spotifyActions: bindActionCreators(spotifyActions, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(Search);
