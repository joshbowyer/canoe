'use strict'
/* global angular */
angular.module('canoeApp.services').factory('incomingData', function ($log, $state, $timeout, $ionicHistory, $rootScope, lodash, nanoService, scannerService, appConfigService, popupService, gettextCatalog) {
  var root = {}

  root.showMenu = function (data) {
    $rootScope.$broadcast('incomingDataMenu.showMenu', data)
  }

  root.redir = function (data, cb) {
    $log.debug('Processing incoming data: ' + data)

    function sanitizeUri (data) {
      // Fixes when a region uses comma to separate decimals
      var regex = /[\?\&]amount=(\d+([\,\.]\d+)?)/i
      var match = regex.exec(data)
      if (!match || match.length === 0) {
        return data
      }
      var value = match[0].replace(',', '.')
      var newUri = data.replace(regex, value)
      // mobile devices, uris
      newUri.replace('://', ':')
      return newUri
    }

    function getParameterByName (name, url) {
      if (!url) return
      name = name.replace(/[\[\]]/g, '\\$&')
      var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
      var results = regex.exec(url)
      if (!results) return null
      if (!results[2]) return ''
      return decodeURIComponent(results[2].replace(/\+/g, ' '))
    }

    function goSend (addr, amount, message, alias) {
      $state.go('tabs.send', {}, {
        'reload': true,
        'notify': $state.current.name !== 'tabs.send'
      })
      var toName = null
      if (typeof alias !== 'undefined' && alias !== null) {
        toName = '@' + alias
      }
      // Timeout is required to enable the "Back" button
      $timeout(function () {
        if (amount) {
          $state.transitionTo('tabs.send.confirm', {
            toAmount: amount,
            toAddress: addr,
            toName: toName,
            description: message,
            toAlias: alias
          })
        } else {
          $state.transitionTo('tabs.send.amount', {
            toAddress: addr
          })
        }
      }, 100)
    }

    // Some smart fixes
    data = sanitizeUri(data)
    nanoService.parseQRCode(data, function (err, code) {
      // If we get error here, we can't pop up since this is incremental input etc
      // so let cb handle it if we have it
      if (err) {
        if (cb) {
          return cb(err, code)
        } else {
          $log.debug('Parse QR code error: ' + err)
          return false
        }
      }
      var protocol = code.protocol
      if (protocol === 'xrb' || protocol === 'raiblocks' || protocol === 'nano') {
        // if (code.alias !== null) {
        //   if (code.params.amount) {
        //     $log.debug('Go send ' + JSON.stringify(code))
        //     goSend(code.account, code.params.amount, code.params.message, code.alias)
        //   } else {
        //     goToAmountPage(code.account, code.alias)
        //   }
        // } else {
          if (code.params.amount) {
            $log.debug('Go send ' + JSON.stringify(code))
            goSend(code.account, code.params.amount, code.params.message)
          } else {
            goToAmountPage(code.account)
          }
        // }
        return cb(null, code)
      } else if (protocol === 'xrbkey' || protocol === 'nanokey') {
        // A private key
        // xrbkey:<encoded private key>[?][label=<label>][&][message=<message>]

      } else if (protocol === 'xrbseed' || protocol === 'nanoseed') {

        // Example QR urls, see https://github.com/clemahieu/raiblocks/wiki/URI-and-QR-Code-Standard
        // Payment:
        // xrb:xrb_<encoded address>[?][amount=<raw amount>][&][label=<label>][&][message=<message>]
        // Key import:
        // xrbkey:<encoded private key>[?][label=<label>][&][message=<message>]
        // Seed import:
        // xrbseed:<encoded seed>[?][label=<label>][&][message=<message>][&][lastindex=<index>]
        // We could add:
        // Contact?
        // Payment with confirmation

      } else {
        // Offer clipboard
        if ($state.includes('tabs.scan')) {
          root.showMenu({
            data: data,
            type: 'text'
          })
        }
      }
      return cb(null, code)
    })
  }

  function goToAmountPage (toAddress, toAlias) {
    $state.go('tabs.send', {}, {
      'reload': true,
      'notify': $state.current.name !== 'tabs.send'
    })
    var toName = null
    if (typeof toAlias !== 'undefined' && toAlias !== null) {
      toName = '@' + toAlias
    }
    $timeout(function () {
      $state.transitionTo('tabs.send.amount', {
        toAddress: toAddress,
        toName: toName,
        toAlias: toAlias
      })
    }, 100)
  }

  return root
})
