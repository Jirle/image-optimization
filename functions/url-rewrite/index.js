// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

function findClosest(arr, target) {
  return arr.reduce((prev, curr) =>
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev,
  );
}

function handler(event) {
  var request = event.request;
  var originalImagePath = request.uri;
  //  validate, process and normalize the requested operations in query parameters
  var normalizedOperations = {};
  if (request.querystring) {
    Object.keys(request.querystring).forEach((operation) => {
      switch (operation.toLowerCase()) {
        case "format":
          var SUPPORTED_FORMATS = [
            "auto",
            "jpeg",
            "webp",
            "avif",
            "png",
            "svg",
            "gif",
          ];
          if (
            request.querystring[operation]["value"] &&
            SUPPORTED_FORMATS.includes(
              request.querystring[operation]["value"].toLowerCase(),
            )
          ) {
            var format = request.querystring[operation]["value"].toLowerCase(); // normalize to lowercase
            if (format === "auto") {
              format = "jpeg";
              if (request.headers["accept"]) {
                // INFO: We prefer to use webp always
                // if (request.headers['accept'].value.includes("avif")) {
                //     format = 'avif';
                // } else if (request.headers['accept'].value.includes("webp")) {
                //     format = 'webp';
                // }
                if (request.headers["accept"].value.includes("webp")) {
                  format = "webp";
                }
              }
            }
            normalizedOperations["format"] = format;
          }
          break;
        case "width":
          if (request.querystring[operation]["value"]) {
            var width = parseInt(request.querystring[operation]["value"]);
            if (!isNaN(width) && width > 1) {
              const imageSizes = [16, 32, 48, 64, 96, 128, 256, 384]; // our imageSizes in nextjs config file
              const deviceSizes = [640, 750, 828, 1080, 1200]; // our deviceSizes in nextjs config file
              const combined = [...imageSizes, ...deviceSizes];

              const finalWidth = findClosest(combined, width);

              // you can protect the Lambda function by setting a max value, e.g. if (width > 4000) width = 4000;
              normalizedOperations["width"] = finalWidth.toString();
            }
          }
          break;
        // INFO: We don't need height
        // case "height":
        //   if (request.querystring[operation]["value"]) {
        //     var height = parseInt(request.querystring[operation]["value"]);
        //     if (!isNaN(height) && height > 0) {
        //       // you can protect the Lambda function by setting a max value, e.g. if (height > 4000) height = 4000;
        //       normalizedOperations["height"] = height.toString();
        //     }
        //   }
        //   break;
        case "quality":
          if (request.querystring[operation]["value"]) {
            var quality = parseInt(request.querystring[operation]["value"]);
            if (!isNaN(quality) && quality > 0) {
              if (quality > 100) quality = 100;
              normalizedOperations["quality"] = quality.toString();
            }
          }
          break;
        default:
          break;
      }
    });
    //rewrite the path to normalized version if valid operations are found
    if (Object.keys(normalizedOperations).length > 0) {
      // put them in order
      var normalizedOperationsArray = [];
      if (normalizedOperations.format)
        normalizedOperationsArray.push("format=" + normalizedOperations.format);
      if (normalizedOperations.quality)
        normalizedOperationsArray.push(
          "quality=" + normalizedOperations.quality,
        );
      if (normalizedOperations.width)
        normalizedOperationsArray.push("width=" + normalizedOperations.width);
      if (normalizedOperations.height)
        normalizedOperationsArray.push("height=" + normalizedOperations.height);
      request.uri =
        originalImagePath + "/" + normalizedOperationsArray.join(",");
    } else {
      // If no valid operation is found, flag the request with /original path suffix
      request.uri = originalImagePath + "/original";
    }
  } else {
    // If no query strings are found, flag the request with /original path suffix
    request.uri = originalImagePath + "/original";
  }
  // remove query strings
  request["querystring"] = {};
  return request;
}
