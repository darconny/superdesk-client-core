import DiffMatchPatch from 'diff-match-patch';

class LinkFunction {
    constructor(compareVersions, lock, $timeout, config, scope, elem) {
        this.compareVersions = compareVersions;
        this.lock = lock;
        this.$timeout = $timeout;
        this.config = config;
        this.scope = scope;
        this.elem = elem;

        this.diffMatchPatch = new DiffMatchPatch();

        this.init();
    }

    /**
     * @ngdoc method
     * @name sdCompareVersionsArticle#init
     * @private
     * @description Initializes the directive with default values for the scope
     * and with necessary watchers.
     */
    init() {
        this.scope.$watch('[article, compareWith]', (newVal, oldVal) => {
            if (newVal && newVal !== oldVal) {
                this.openItem();
            }
        });

        this.scope.remove = this.remove.bind(this);

        this.openItem();
    }

    /**
     * @ngdoc method
     * @name sdCompareVersionsArticle#remove
     * @description Removes the item from opened board.
     */
    remove(item) {
        this.compareVersions.remove({id: item._id, version: item._current_version});
    }

    /**
     * @ngdoc method
     * @name sdCompareVersionsArticle#openItem
     * @private
     * @description Opens the selected article version in sdArticleEdit directive.
     */
    openItem() {
        let item = _.find(this.compareVersions.versions, {_current_version: this.scope.article.version});

        this.scope.origItem = item;
        this.scope.item = _.cloneDeep(item);
        this.scope._editable = false;
        this.scope.isMediaType = _.includes(['audio', 'video', 'picture', 'graphic'], this.scope.item.type);

        if (this.scope.compareWith && this.scope.article !== this.scope.compareWith) {
            let compareWithItem = _.find(this.compareVersions.versions,
                {_current_version: this.scope.compareWith.version});

            this.scope.compareWithItem = _.create(compareWithItem);
            this.setVersionsDifference(this.scope.item, this.scope.compareWithItem);
        }

        if (this.scope.focus) {
            this.$timeout(() => {
                this.elem.children().focus();
            }, 0, false);
        }

        this.scope.isLocked = this.lock.isLocked(item);
    }

    /**
     * @ngdoc method
     * @name sdCompareVersionsArticle#setVersionsDifference
     * @param {Object} item - current item version
     * @param {Object} oldItem - old item to compare with
     * @description Changes 'headline', 'abstract', 'body_footer', 'body_html', 'byline' from item
     * in order to highlight the differences from oldItem
     */
    setVersionsDifference(item, oldItem) {
        const fields = ['headline', 'abstract', 'body_footer', 'body_html', 'byline'];

        _.map(fields, (field) => {
            if (item[field] || oldItem[field]) {
                item[field] = this.highlightDifferences(item[field], oldItem[field]);
            }
        });

        if (item.associations && item.associations.featuremedia &&
            oldItem.associations && oldItem.associations.featuremedia) {
            item.associations.featuremedia.description_text = this.highlightDifferences(
                item.associations.featuremedia.description_text,
                oldItem.associations.featuremedia.description_text
            );
        }
    }

    /**
     * @ngdoc method
     * @name sdCompareVersionsArticle#highlightDifferences
     * @param {String} newText - current text
     * @param {String} oldText - old text to compare with
     * @description Highlight the differences between new text and old text
     */
    highlightDifferences(newText, oldText) {
        let diffs = this.diffMatchPatch.diff_main(this.cleanHtml(oldText), this.cleanHtml(newText));

        this.diffMatchPatch.diff_cleanupSemantic(diffs);

        diffs = this.splitByTag(diffs, '<p>');
        diffs = this.splitByTag(diffs, '</p>');

        let text = this.diffMatchPatch
            .diff_prettyHtml(diffs)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/<span><p><\/span>/g, '<p>')
            .replace(/<span><\/p><\/span>/g, '</p>')
            .replace(/&nbsp;/g, ' ');

        if (this.config.features.editor3) {
            text = text.replace(/<ins/g, '<code')
                   .replace(/<\/ins>/g, '</code>');
        }

        return text;
    }

    /**
     * @ngdoc method
     * @name sdCompareVersionsArticle#cleanHtml
     * @param {String} text - html text
     * @description Replace html encodings
     */
    cleanHtml(text) {
        return (text || '<p></p>').replace(/\n/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt/g, '<')
            .replace(/&gt/g, '>');
    }

    /**
     * @ngdoc method
     * @name sdCompareVersionsArticle#splitByTag
     * @param {Object} diffs - current diffs
     * @param {String} tag - current tag
     * @description If one item in diffs contain the html tag, split
     * item by html tag and put html tag as a nonchanged item.
     */
    splitByTag(diffs, tag) {
        let result = [];

        _.map(diffs, (diff) => {
            if (diff[1] === tag) {
                result.push([0, tag]);
            } else {
                var list = diff[1].split(tag);

                _.map(list, (item) => {
                    if (item !== '') {
                        result.push([diff[0], item]);
                    } else {
                        result.push([0, tag]);
                    }
                });
            }
        });

        return result;
    }
}

/**
 * @ngdoc directive
 * @module superdesk.apps.authoring.compare_versions
 * @name sdCompareVersionsArticle
 * @requires compareVersions
 * @requires lock
 * @requires $timeout
 * @param {Object} article - current article's version to display on board - {id: _id, version: _current_version}
 * @param {Boolean} focus - determines if focus needs to set on this board.
 * @description Displays the board which contains sdArticleEdit directive to display the contents of the selected
 * version of opened article and provides a remove function to remove the item version from board.
 */
export function CompareVersionsArticleDirective(compareVersions, lock, $timeout, config) {
    return {
        template: require('scripts/apps/authoring/compare-versions/views/sd-compare-versions-article.html'),
        scope: {article: '=', compareWith: '=', focus: '='},
        link: (scope, elem) => new LinkFunction(compareVersions, lock, $timeout, config, scope, elem)
    };
}

CompareVersionsArticleDirective.$inject = ['compareVersions', 'lock', '$timeout', 'config'];
